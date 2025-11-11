document.addEventListener("DOMContentLoaded", () => {
  const tablaCartas = document.getElementById("tabla-cartas");

  // Cartas disponibles (ajusta según tus imágenes)
  const baraja = [
    "carta1", "carta2", "carta3", "carta4",
    "carta5", "carta6", "carta7", "carta8",
    "carta9", "carta10", "carta11", "carta12",
    "carta13", "carta14", "carta15", "carta16"
  ];

  baraja.forEach(carta => {
    const div = document.createElement("div");
    div.classList.add("carta");

    const img = document.createElement("img");
    img.src = `imagenes/${carta}.jpeg`;
    img.alt = carta;

    div.appendChild(img);

    div.addEventListener("click", () => {
      const frijol = div.querySelector(".frijol");
      if (frijol) {
        frijol.remove(); // quitar frijol si ya está
      } else {
        const bean = document.createElement("img");
        bean.src = "imagenes/frijol.png";
        bean.classList.add("frijol");
        div.appendChild(bean);
      }
    });

    tablaCartas.appendChild(div);
  });
});






