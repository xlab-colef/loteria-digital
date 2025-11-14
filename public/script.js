document.addEventListener("DOMContentLoaded", () => {

    const socket = io();

    const cartas = [
        "carta1.jpeg","carta2.jpeg","carta3.jpeg","carta4.jpeg",
        "carta5.jpeg","carta6.jpeg","carta7.jpeg","carta8.jpeg",
        "carta9.jpeg","carta10.jpeg","carta11.jpeg","carta12.jpeg",
        "carta13.jpeg","carta14.jpeg","carta15.jpeg","carta16.jpeg"
    ];

    const cartContainer = document.getElementById("cartas");
    const frijolEl = document.getElementById("frijol");
    const cartaActualImg = document.getElementById("carta-actual");
    const miniTableros = document.querySelectorAll(".mini-tablero");

    let url = new URLSearchParams(window.location.search);
    let playerName = url.get("name") || prompt("Tu nombre:") || "Jugador";
    let roomId = url.get("sala") || prompt("Código de sala:") || null;

    if (!roomId) {
        roomId = Math.floor(1000 + Math.random()*9000).toString();
        alert("Sala creada: " + roomId);
    }

    socket.emit("joinRoom", { roomId, name: playerName });

    function crearTablero() {
        cartContainer.innerHTML = "";
        cartas.forEach(name => {
            const div = document.createElement("div");
            div.className = "carta";
            div.dataset.nombre = name;

            div.innerHTML = `<img src="imagenes/${name}">`;

            div.addEventListener("dragover", e => e.preventDefault());
            div.addEventListener("drop", () => {
                div.classList.add("marcada");
                socket.emit("markCard", { roomId, cardName: name });
                resetFrijol();
            });

            cartContainer.appendChild(div);
        });
    }
    crearTablero();

    // carta actual rotatoria
    let idx = 0;
    setInterval(() => {
        cartaActualImg.src = `imagenes/${cartas[idx]}`;
        idx = (idx + 1) % cartas.length;
    }, 2500);

    // frijol drag
    const orig = { left: "18px", top: "18px" };

    frijolEl.addEventListener("dragstart", () => {});
    document.addEventListener("dragend", resetFrijol);

    function resetFrijol() {
        frijolEl.style.left = orig.left;
        frijolEl.style.top = orig.top;
    }

    // actualizar mini-tableros
    socket.on("roomState", (state) => {
        const others = state.players.filter(p => p.name !== playerName);

        for (let i = 0; i < 4; i++) {
            const mini = miniTableros[i];
            mini.innerHTML = "";

            if (!others[i]) continue;

            const p = others[i];

            const nameEl = document.createElement("div");
            nameEl.textContent = p.name;
            nameEl.style.fontSize = "10px";
            nameEl.style.gridColumn = "1 / -1";
            mini.appendChild(nameEl);

            const grid = [0,1,2,3];

            grid.forEach(pos => {
                const cell = document.createElement("div");
                if (p.marks[pos]) {
                    const bean = document.createElement("div");
                    bean.className = "mini-frijol";
                    cell.appendChild(bean);
                }
                mini.appendChild(cell);
            });
        }
    });

});



























