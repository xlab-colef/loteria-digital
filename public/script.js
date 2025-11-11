// Generar las cartas del tablero
const cartas = [
  "carta1.jpeg", "carta2.jpeg", "carta3.jpeg", "carta4.jpeg",
  "carta5.jpeg", "carta6.jpeg", "carta7.jpeg", "carta8.jpeg",
  "carta9.jpeg", "carta10.jpeg", "carta11.jpeg", "carta12.jpeg",
  "carta13.jpeg", "carta14.jpeg", "carta15.jpeg", "carta16.jpeg"
];

const contenedorCartas = document.getElementById("cartas");

cartas.forEach(nombre => {
  const div = document.createElement("div");
  div.classList.add("carta");
  div.innerHTML = `<img src="imagenes/${nombre}" alt="${nombre}">`;
  contenedorCartas.appendChild(div);
});

// Carta actual (simulada)
const cartaActual = document.getElementById("carta-actual");
let indice = 0;
setInterval(() => {
  cartaActual.src = `imagenes/${cartas[indice]}`;
  indice = (indice + 1) % cartas.length;
}, 2500);

// Función arrastrar y soltar frijol
const frijol = document.getElementById("frijol");
const todasCartas = document.querySelectorAll(".carta");

todasCartas.forEach(carta => {
  carta.addEventListener("dragover", e => e.preventDefault());
  carta.addEventListener("drop", e => {
    e.preventDefault();
    if (!carta.querySelector(".frijol")) {
      const nuevoFrijol = document.createElement("img");
      nuevoFrijol.src = "imagenes/frijol.png";
      nuevoFrijol.classList.add("frijol");
      carta.appendChild(nuevoFrijol);
    }
    frijol.style.top = "20px";
    frijol.style.left = "20px";
  });
});

frijol.addEventListener("dragstart", e => {
  e.dataTransfer.setData("text/plain", "frijol");
});







