let currentOrder = null;

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
  const params = new URLSearchParams(window.location.search);
  const orderId = Number(params.get("orderId"));

  try {
    const res = await fetch(`http://localhost:8002/orders/${orderId}`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });

    if (!res.ok) {
      alert("Ошибка загрузки заказа: " + res.status);
      return;
    }

    const order = await res.json();
    initOrderInfo(order);
  } catch (err) {
    console.error("Ошибка сети:", err);
    alert("Не удалось получить данные заказа");
  }
  document.querySelector(".add-button").addEventListener("click", () => {
  openProductModal();
});

    function openProductModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "product-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" id="close-modal">&times;</span>
        <h2>Выберите товар</h2>
        <div id="product-list"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = "flex";
    const list = modal.querySelector("#product-list");
    list.innerHTML = "";

    products.forEach(prod => {
      const div = document.createElement("div");
      div.className = "product-entry";
      div.innerHTML = `${prod.name} - ${prod.cost} ₽ <button data-id="${prod.id}">Добавить</button>`;
      list.appendChild(div);
    });

    document.querySelectorAll(".product-entry button").forEach(btn => {
      btn.addEventListener("click", () => {
        const productId = +btn.dataset.id;
        const product = products.find(p => p.id === productId);
        addProductToOrder(product);
        modal.remove();
      });
    });

    document.getElementById("close-modal").onclick = () => modal.remove();
}
});


document.getElementById('logout')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login/login.html';
});


function initOrderInfo(order) {
  currentOrder = order;
  document.getElementById("order-title").textContent = `Заказ №${order.number}`;
  const itemsContainer = document.getElementById("items-container");
  itemsContainer.innerHTML = "";

  order.items.forEach(item => {
    const row = document.createElement("div");
    row.className = "table-row";
    row.dataset.productId = item.product_id;

    const name = document.createElement("div");
    name.className = "table-cell";

    const qty = document.createElement("div");
    qty.className = "table-cell";
    const input = document.createElement("input");
    input.type = "number";
    input.value = item.product_quantity;
    input.min = 1;
    input.className = "order-qty-input";
    qty.appendChild(input);

    const cost = document.createElement("div");
    cost.className = "table-cell";

    const del = document.createElement("div");
    del.className = "table-cell";
    const btn = document.createElement("button");
    btn.textContent = "Удалить";
    btn.className = "remove-button";
    btn.onclick = () => {
      row.remove();
      recalculateTotal();
    };
    del.appendChild(btn);

    fetch(`http://localhost:8001/products/${item.product_id}`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("token")
      }
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(product => {
        const unitPrice = product.cost;
        name.textContent = product.name;
        cost.textContent = (unitPrice * item.product_quantity).toFixed(2) + " ₽";

        input.addEventListener("input", () => {
          const qtyValue = parseInt(input.value) || 0;
          cost.textContent = (qtyValue * unitPrice).toFixed(2) + " ₽";
          recalculateTotal();
        });

        row.append(name, qty, cost, del);
        itemsContainer.appendChild(row);
        recalculateTotal();
      })
      .catch(err => {
        console.warn("Ошибка загрузки товара", item.product_id, err);
        name.textContent = `Товар #${item.product_id}`;
        cost.textContent = "-";
        row.append(name, qty, cost, del);
        itemsContainer.appendChild(row);
        recalculateTotal();
      });
  });

  document.getElementById("name").value = order.customer.name;
  document.getElementById("email").value = order.customer.email;
  document.getElementById("phone").value = order.customer.phone;
  document.getElementById("address").value = order.address;
  document.getElementById("info").value = order.information;

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
  if (status.id === order.status.id) {
    option.selected = true;
  }
  statusSelect.appendChild(option);
});
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

function recalculateTotal() {
  const rows = document.querySelectorAll("#items-container .table-row");
  let totalSum = 0;

  rows.forEach(row => {
    const costText = row.children[2].textContent.replace(" ₽", "").trim();
    const cost = parseFloat(costText);
    if (!isNaN(cost)) {
      totalSum += cost;
    }
  });

  document.getElementById("total-price").textContent = `Общая стоимость заказа: ${totalSum.toFixed(2)} рублей`;
}


function addProductToOrder(product) {
  const alreadyExists = Array.from(document.getElementById("items-container").children).some(row => {
    return +row.dataset.productId === product.id;
  });

  if (alreadyExists) {
    alert("Этот товар уже есть в заказе.");
    return;
  }

  const container = document.getElementById("items-container");
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
  input.className = "order-qty-input";
  qty.appendChild(input);

  const cost = document.createElement("div");
  cost.className = "table-cell";
  const unitCost = parseFloat(product.cost);
  cost.textContent = unitCost.toFixed(2) + " ₽";


  const del = document.createElement("div");
  del.className = "table-cell";
  const btn = document.createElement("button");
  btn.textContent = "Удалить";
  btn.className = "remove-button";
  btn.onclick = () => {
    row.remove();
    recalculateTotal();
  };
  del.appendChild(btn);

  input.addEventListener("input", () => {
    cost.textContent = (input.value * unitCost).toFixed(2) + " ₽";
    recalculateTotal();
  });

  row.append(name, qty, cost, del);
  container.appendChild(row);
  recalculateTotal();
}


document.getElementById("save-button").addEventListener("click", () => {
  if (!currentOrder) {
    alert("Данные заказа не загружены");
    return;
  }

  const updatedOrder = {
    id: currentOrder.id,
    number: currentOrder.number,
    date: currentOrder.date,
    price: parseFloat(document.getElementById("total-price").textContent.match(/[\d.]+/)[0]) || 0,
    customer_id: currentOrder.customer.id,
    address: document.getElementById("address").value,
    information: document.getElementById("info").value,
    status_id: parseInt(document.getElementById("status").value),

    customer: {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      id: currentOrder.customer.id
    },

    items: Array.from(document.querySelectorAll("#items-container .table-row")).map(row => {
      const productId = parseInt(row.dataset.productId);
      const quantity = parseInt(row.querySelector("input").value);
      return {
        product_id: productId,
        product_quantity: quantity
      };
    })
  };


  fetch(`http://localhost:8002/orders/${updatedOrder.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    },
    body: JSON.stringify(updatedOrder)
  })
    .then(res => {
      if (res.ok) {
        showFullModal("Заказ сохранён");
      } else {
        alert("Ошибка сохранения: " + res.status);
      }
    })
    .catch(err => {
      console.error("Ошибка сети:", err);
      alert("Ошибка отправки данных");
    });
});

function showFullModal(message = "Заказ сохранён") {
  document.getElementById("modal-message").textContent = message;
  document.getElementById("overlay").style.display = "block";
  document.getElementById("modal-window").style.display = "block";
}

document.getElementById("modal-ok").addEventListener("click", () => {
  document.getElementById("modal-window").style.display = "none";
  document.getElementById("overlay").style.display = "none";
});


