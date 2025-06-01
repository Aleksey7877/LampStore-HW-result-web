document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login/login.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      localStorage.removeItem("token");
      window.location.href = "/login/login.html";
      return;
    }
  } catch (err) {
    console.error("Ошибка при проверке токена:", err);
    localStorage.removeItem("token");
    window.location.href = "/login/login.html";
    return;
  }

  let products = [];

  fetch("http://localhost:8001/products", {
    headers: {
      "Authorization": "Bearer " + localStorage.getItem("token")
    }
  })
    .then(res => res.json())
    .then(data => products = data.filter(p => p.status === "active"))
    .catch(err => console.error("Ошибка загрузки продуктов:", err));


  document.querySelector(".add-button").addEventListener("click", function () {
    openProductModal();
  });

  document.getElementById('logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login/login.html';
  });


  function openProductModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "product-modal";
    modal.innerHTML = '' +
      '<div class="modal-content">' +
      '<span class="close" id="close-modal">&times;</span>' +
      '<h2>Выберите товар</h2>' +
      '<div id="product-list"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.style.display = "flex";

    const list = modal.querySelector("#product-list");
    list.innerHTML = "";
    products.forEach(function (prod) {
      const div = document.createElement("div");
      div.className = "product-entry";
      div.innerHTML = prod.name + " - " + prod.cost + " ₽ " +
        '<button data-id="' + prod.id + '">Добавить</button>';
      list.appendChild(div);
    });

    document.querySelectorAll(".product-entry button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const productId = +btn.dataset.id;
        const product = products.find(function (p) {
          return p.id === productId;
        });
        addProductToOrder(product);
        modal.remove();
      });
    });

    document.getElementById("close-modal").onclick = function () {
      modal.remove();
    };
  }


  function addProductToOrder(product) {
    const container = document.getElementById("items-container");

    const alreadyExists = Array.from(container.children).some(row => {
      return +row.dataset.productId === product.id;
    });

    if (alreadyExists) {
      alert("Этот товар уже добавлен в заказ.");
      return;
    }

    const row = document.createElement("div");
    row.className = "table-row";
    row.dataset.productId = product.id;

    const name = document.createElement("div");
    name.className = "table-cell";
    name.textContent = product.name;

    const qty = document.createElement("div");
    qty.className = "table-cell";
    const input = document.createElement("input");
    input.type = "number";
    input.value = 1;
    input.min = 1;
    qty.appendChild(input);

    const cost = document.createElement("div");
    cost.className = "table-cell";
    function updateCost() {
      cost.textContent = (input.value * product.cost).toFixed(2) + " ₽";
    }
    input.addEventListener("input", function () {
      updateCost();
      updateTotal();
    });
    updateCost();

    const del = document.createElement("div");
    del.className = "table-cell";
    const btn = document.createElement("button");
    btn.textContent = "Удалить";
    btn.onclick = function () {
      row.remove();
      updateTotal();
    };
    del.appendChild(btn);

    row.append(name, qty, cost, del);
    container.appendChild(row);
    updateTotal();
  }


  function updateTotal() {
    const rows = document.querySelectorAll(".table-row");
    let total = 0;

    rows.forEach(function (row) {
      const cost = row.children[2].textContent.replace(" ₽", "");
      total += parseFloat(cost);
    });

    document.getElementById("total-price").textContent =
      "Общая стоимость заказа: " + total.toFixed(2) + " рублей";
  }

  const statusSelect = document.getElementById("status");
  statusSelect.innerHTML = "";

  const statuses = [
    { id: 1, name: "new" },
    { id: 2, name: "processing" },
    { id: 3, name: "completed" },
    { id: 4, name: "cancelled" }
  ];

  statuses.forEach(status => {
    const option = document.createElement("option");
    option.value = status.id;
    option.textContent = status.name;
    statusSelect.appendChild(option);
  });

  statusSelect.value = 1;


  document.getElementById("save-button").addEventListener("click", function () {
    const customerPayload = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value
    };


    fetch("http://localhost:8002/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify(customerPayload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Ошибка при создании клиента");
        return res.json();
      })
      .then(customerData => {
        const items = [];
        document.querySelectorAll(".table-row").forEach(function (row) {
          const productId = +row.dataset.productId;
          const qty = +row.querySelector("input").value;
          items.push({
            product_id: productId,
            product_quantity: qty
          });
        });


        return fetch("http://localhost:8002/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
          },
          body: JSON.stringify({
            customer_id: customerData.id,
            address: document.getElementById("address").value,
            information: document.getElementById("info").value,
            status_id: +document.getElementById("status").value,
            items: items
          })
        });
      })
      .then(res => {
        if (res.ok) {
          showModal("Заказ успешно создан!");
        } else {
          return res.text().then(t => {
            console.error("Ошибка ответа:", t);
            alert("Ошибка создания заказа: " + res.status);
          });
        }
      })
      .catch(err => {
        console.error("Ошибка:", err);
        alert("Ошибка при создании заказа");
      });
  });


  function showModal(message) {
    const overlay = document.getElementById("overlay");
    const modal = document.getElementById("modal-window");
    const msg = document.getElementById("modal-message");
    msg.textContent = message;
    overlay.style.display = "block";
    modal.style.display = "block";

    document.getElementById("modal-ok").onclick = function () {
      overlay.style.display = "none";
      modal.style.display = "none";
      window.location.href = "/orders/index.html";
    };
  }});
 
