document.addEventListener("DOMContentLoaded", () => {
  fetch('menu_ceroestres.json')
    .then(res => res.json())
    .then(data => {
      renderMenu(data);
      // Llenar preciosProductos al cargar el menú
      data.categorias.forEach(cat => {
        cat.productos.forEach(prod => {
          // Usar el nombre completo del producto (con o sin precio inicial en el nombre)
          // para que coincida con la clave usada en 'cantidades'
          const nombreConPrecio = `${cat.nombre} - ${prod.nombre}` + (prod.precio ? ` - $${prod.precio}` : "");
          preciosProductos[nombreConPrecio] = prod.precio || 0; // Guardar el precio, o 0 si no tiene (como los aderezos)
        });
      });
      generateTimeOptions(); // Llamada a la función para generar opciones de hora
    })
    .catch(err => {
      console.error("Error al cargar menú:", err);
      document.getElementById("menu").innerText = "No se pudo cargar el menú.";
    });

  function renderMenu(data) {
    const menuDiv = document.getElementById("menu");
    data.categorias.forEach(cat => {
      const catDiv = document.createElement("div");
      catDiv.classList.add("category");
      catDiv.innerHTML = `<h3>${cat.nombre}</h3>`;

      cat.productos.forEach(prod => {
        const nombreCompletoProducto = `${cat.nombre} - ${prod.nombre}` + (prod.precio ? ` - $${prod.precio}` : "");
        const textoVisibleProducto = `${prod.nombre}` + (prod.precio ? ` - $${prod.precio}` : "");

        const prodDiv = document.createElement("div");
        prodDiv.classList.add("product");
        prodDiv.innerHTML = `
          <span>${textoVisibleProducto}</span>
          <div>
            <button onclick="updateCantidad('${nombreCompletoProducto.replace(/'/g, "\\'")}', -1)">-</button>
            <span id="qty-${nombreCompletoProducto.replace(/'/g, "\\'")}">0</span>
            <button onclick="updateCantidad('${nombreCompletoProducto.replace(/'/g, "\\'")}', 1)">+</button>
          </div>
        `;
        catDiv.appendChild(prodDiv);
      });

      menuDiv.appendChild(catDiv);
    });
  }

  // --- FUNCIÓN PARA GENERAR LAS OPCIONES DE HORA ---
  function generateTimeOptions() {
    const horaSelect = document.getElementById('horaSelect');
    const minutoSelect = document.getElementById('minutoSelect');

    horaSelect.innerHTML = '';
    minutoSelect.innerHTML = '';

    const defaultOptionHora = document.createElement('option');
    defaultOptionHora.value = '';
    defaultOptionHora.textContent = 'Hora';
    defaultOptionHora.disabled = true;
    defaultOptionHora.selected = true;
    horaSelect.appendChild(defaultOptionHora);

    const defaultOptionMinuto = document.createElement('option');
    defaultOptionMinuto.value = '';
    defaultOptionMinuto.textContent = 'Minuto';
    defaultOptionMinuto.disabled = true;
    defaultOptionMinuto.selected = true;
    minutoSelect.appendChild(defaultOptionMinuto);

    for (let h = 7; h <= 16; h++) { // 7 AM a 4 PM (16:00)
      const hourOption = document.createElement('option');
      let displayHour = h;
      let ampm = 'AM';

      if (h === 12) {
        ampm = 'PM';
      } else if (h > 12) {
        displayHour = h - 12;
        ampm = 'PM';
      }

      const hourValue = String(h).padStart(2, '0'); // Formato HH (ej. 07, 08, 16)
      hourOption.value = hourValue;
      hourOption.textContent = `${displayHour}:00 ${ampm}`; // Texto visible (ej. 7:00 AM, 4:00 PM)

      horaSelect.appendChild(hourOption);
    }

    for (let m = 0; m < 60; m += 15) {
      const minuteOption = document.createElement('option');
      const minuteValue = String(m).padStart(2, '0'); // Formato MM (ej. 00, 15, 30, 45)
      minuteOption.value = minuteValue;
      minuteOption.textContent = minuteValue;
      minutoSelect.appendChild(minuteOption);
    }
  }
}); // Cierre de DOMContentLoaded

const cantidades = {};
const preciosProductos = {}; // Objeto para almacenar los precios de los productos.

function updateCantidad(nombre, delta) {
  if (!(nombre in cantidades)) cantidades[nombre] = 0;
  cantidades[nombre] = Math.max(0, cantidades[nombre] + delta);
  document.getElementById("qty-" + nombre).innerText = cantidades[nombre];
  updateResumen();
}

function updateResumen() {
  const resumen = document.getElementById("resumenPedido");
  const seleccionados = Object.entries(cantidades).filter(([k, v]) => v > 0);
  let totalPedido = 0;

  if (seleccionados.length === 0) {
    resumen.innerHTML = "<p>No hay productos seleccionados.</p>";
    return;
  }
  let html = "<h3>Resumen del pedido:</h3><ul>";

  let cantidadEntrepansOEnsaladas = 0;
  const aderezosPedidos = [];

  // Primero, procesar todos los productos para identificar y separar aderezos
  seleccionados.forEach(([prod, cant]) => {
    // Si el nombre del producto comienza con "Aderezos (2 gratis, extra $5)"
    if (prod.startsWith("Aderezos (2 gratis, extra $5)")) {
      aderezosPedidos.push({ nombre: prod, cantidad: cant });
    } else {
      // Identificar si es un "entrepan" o "ensalada" para contar los productos principales
      if (prod.startsWith("Entrepanes") || prod.startsWith("Ensaladas")) {
        cantidadEntrepansOEnsaladas += cant; // Suma la cantidad de este tipo de producto
      }
      const precioUnitario = preciosProductos[prod] || 0;
      const subtotal = precioUnitario * cant;
      totalPedido += subtotal;
      html += `<li>${prod}: ${cant} x $${precioUnitario} = $${subtotal}</li>`;
    }
  });

  // Procesar los aderezos una vez que sabemos la cantidad de ítems principales
  if (aderezosPedidos.length > 0) {
    const aderezosGratisPermitidos = cantidadEntrepansOEnsaladas * 2;
    let totalAderezosSeleccionados = 0;
    aderezosPedidos.forEach(aderezo => {
      totalAderezosSeleccionados += aderezo.cantidad;
    });

    let aderezosACobrar = Math.max(0, totalAderezosSeleccionados - aderezosGratisPermitidos);
    let costoAderezos = aderezosACobrar * 5; // $5 extra por cada uno
    totalPedido += costoAderezos; // Sumar el costo de los aderezos al total del pedido

    html += `<li><h4>Aderezos:</h4><ul>`;
    aderezosPedidos.forEach(aderezo => {
      // Eliminar la parte de la categoría del nombre del aderezo para una visualización más limpia
      html += `<li>${aderezo.nombre.replace('Aderezos (2 gratis, extra $5) - ', '')}: ${aderezo.cantidad}</li>`;
    });
    html += `</ul>`;
    html += `<p>Total de aderezos seleccionados: ${totalAderezosSeleccionados}</p>`;
    html += `<p>Aderezos gratis permitidos (2 por cada entrepan/ensalada): ${aderezosGratisPermitidos}</p>`;

    if (aderezosACobrar > 0) {
      html += `<p>Aderezos extra a cobrar (${aderezosACobrar} x $5): $${costoAderezos}</p>`;
    } else {
      html += `<p>Todos los aderezos son gratis.</p>`;
    }
    html += `</li>`;
  }

  html += `</ul><h4>Total del pedido: $${totalPedido}</h4>`;
  resumen.innerHTML = html;
}

document.getElementById("pedidoForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value;
  const horaSeleccionada = document.getElementById("horaSelect").value;
  const minutoSeleccionado = document.getElementById("minutoSelect").value;
  const horaCompleta = `${horaSeleccionada}:${minutoSeleccionado}`;
  const comprobante = document.getElementById("comprobante").files[0];
  const productos = Object.entries(cantidades).filter(([_, v]) => v > 0);

  if (!nombre || !horaSeleccionada || !minutoSeleccionado || productos.length === 0) {
    alert("Completa tu nombre, selecciona la hora y el minuto de recogida, y selecciona al menos un producto.");
    return;
  }

  console.log("Pedido:", { nombre, hora: horaCompleta, productos, comprobante });
  alert("Pedido enviado a cocina :)");
});