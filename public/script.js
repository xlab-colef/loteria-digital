// SCRIPT: genera tablero desde 'cartas' (usa <img> por carta) y arrastre/soltar frijol

document.addEventListener("DOMContentLoaded", () => {
  const cartContainer = document.getElementById("cartas");
  const frijol = document.getElementById("frijol");
  const cartaActualImg = document.getElementById("carta-actual");

  // Nombres de archivos (asegúrate que existan en public/imagenes/)
  const cartas = [
    "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
    "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
    "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
    "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
  ];

  // crear cartas en grid
  function crearTablero() {
    cartContainer.innerHTML = "";
    cartas.forEach((nombre, idx) => {
      const div = document.createElement("div");
      div.className = "carta";
      div.dataset.nombre = nombre;
      const img = document.createElement("img");
      img.src = `imagenes/${nombre}`;
      img.alt = nombre;
      // si la imagen falla, mostrar un borde para debug
      img.onerror = () => {
        img.style.objectFit = "contain";
        img.style.background = "#eee";
      }
      div.appendChild(img);
      cartContainer.appendChild(div);

      // permitir drop en cada carta
      div.addEventListener("dragover", e => e.preventDefault());
      div.addEventListener("drop", e => {
        e.preventDefault();
        // si ya está marcada, no agregar otra
        if (!div.classList.contains("marcada")) {
          div.classList.add("marcada");
        }
        // regresar frijol a su lugar
        devolverFrijol();
      });
    });
  }

  crearTablero();

  // animar carta actual (simulada)
  let idx = 0;
  setInterval(() => {
    cartaActualImg.src = `imagenes/${cartas[idx]}`;
    idx = (idx + 1) % cartas.length;
  }, 2500);

  /* ===== Drag & Drop del frijol ===== */
  // Guardar la posicion original
  const frijolOrig = { left: frijol.style.left || "18px", top: frijol.style.top || "18px" };

  frijol.addEventListener("dragstart", (e) => {
    // se puede usar para indicar que el frijol se está arrastrando
    e.dataTransfer.setData("text/plain", "frijol");
    // para firefox
    const crt = frijol.cloneNode(true);
    crt.style.opacity = "0.7";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 20);
    setTimeout(() => crt.remove(), 0);
  });

  // Si se suelta en cualquier lugar (no carta), regresarlo a origen
  document.addEventListener("dragend", (e) => {
    // dragend puede dispararse incluso cuando ya hizo drop; devolvemos igual por seguridad
    devolverFrijol();
  });

  function devolverFrijol() {
    frijol.style.left = frijolOrig.left;
    frijol.style.top = frijolOrig.top;
  }

  // Para que el frijol se pueda arrastrar con mouse (soporte touch extra, opcional)
  frijol.addEventListener("mousedown", (e) => {
    // no interferimos con drag native
  });

  /* Opcional: permitir reiniciar marcas con doble click en tablero */
  cartContainer.addEventListener("dblclick", () => {
    document.querySelectorAll(".carta.marcada").forEach(c => c.classList.remove("marcada"));
  });
});








