document.getElementById('logout')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login/login.html';
});


function createEmptyCard(product) {
	const wrapper = document.createElement('div');
	wrapper.className = 'product-wrapper';

	const card = document.createElement('div');
	card.className = 'product-card';

	const left = document.createElement('div');
	left.className = 'card-column left-column';

	const nameInput = document.createElement('input');
	nameInput.className = 'product-name';
	nameInput.type = 'text';
	nameInput.value = product.name;
	left.appendChild(nameInput);

	const priceLabel = document.createElement('div');
	priceLabel.className = 'field-label';
	priceLabel.textContent = 'Цена:';
	left.appendChild(priceLabel);

	const priceInput = document.createElement('input');
	priceInput.className = 'input-price';
	priceInput.type = 'number';
	priceInput.value = product.cost;
	left.appendChild(priceInput);

	const descLabel = document.createElement('div');
	descLabel.className = 'field-label field-label-wrap';
	descLabel.textContent = 'Описание:';
	left.appendChild(descLabel);

	const descInput = document.createElement('textarea');
	descInput.rows = 2;
	descInput.className = 'input-long';
	descInput.value = product.description;
	left.appendChild(descInput);

	const attrWrapper = document.createElement('div');
	attrWrapper.className = 'attributes-wrapper';

	const powerRow = document.createElement('div');
	powerRow.className = 'attribute-row';
	const powerLabel = document.createElement('div');
	powerLabel.className = 'attribute-label';
	powerLabel.textContent = 'Мощность:';
	const powerInput = document.createElement('input');
	powerInput.className = 'attribute-input';
	powerInput.type = 'text';
	powerInput.value = product.attributes.power;
	powerRow.append(powerLabel, powerInput);

	const colorRow = document.createElement('div');
	colorRow.className = 'attribute-row';
	const colorLabel = document.createElement('div');
	colorLabel.className = 'attribute-label';
	colorLabel.textContent = 'Цвет:';
	const colorInput = document.createElement('input');
	colorInput.className = 'attribute-input';
	colorInput.type = 'text';
	colorInput.value = product.attributes.color;
	colorRow.append(colorLabel, colorInput);

	attrWrapper.append(powerRow, colorRow);
	left.appendChild(attrWrapper);

	const right = document.createElement('div');
	right.className = 'card-column right-column';

	const rectangle = document.createElement('div');
	rectangle.className = 'product-image';
	rectangle.style.backgroundImage = `url('${product.image_url}')`;
	right.appendChild(rectangle);

	const uploadBtn = document.createElement('button');
	uploadBtn.className = 'photo-button';
	uploadBtn.textContent = 'Загрузить фото';
	right.appendChild(uploadBtn);

	uploadBtn.addEventListener('click', () => {
		document.getElementById('imageModal').style.display = 'flex';
		window._currentImageTarget = rectangle;
		window._currentProductRef = product;
	});

	const archiveBlock = document.createElement('div');
	archiveBlock.className = 'archive-block';

	const archiveCheckbox = document.createElement('input');
	archiveCheckbox.type = 'checkbox';
	archiveCheckbox.className = 'archive-checkbox';
	archiveCheckbox.checked = (product.status?.toLowerCase() === 'archived');

	const archiveLabel = document.createElement('span');
	archiveLabel.className = 'archive-label';
	archiveLabel.textContent = 'В архиве';

	archiveBlock.append(archiveCheckbox, archiveLabel);
	right.appendChild(archiveBlock);

	card.append(left, right);
	wrapper.appendChild(card);

	const saveWrapper = document.createElement('div');
	saveWrapper.className = 'save-wrapper';

	const saveBtn = document.createElement('button');
	saveBtn.className = 'save-button';
	saveBtn.textContent = 'Сохранить';

	saveBtn.addEventListener('click', () => {
	const data = {
		name: nameInput.value,
		description: descInput.value,
		cost: Number(priceInput.value),
		status: archiveCheckbox.checked ? 'archived' : 'active',
		image_url: product.image_url,
		attributes: {
		power: powerInput.value,
		color: colorInput.value
		}
	};


	fetch(`http://localhost:8001/products/${product.id}`, {
		method: 'PUT',
		headers: {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + localStorage.getItem('token')
		},
		body: JSON.stringify(data)
	})
		.then(res => {
		if (res.ok) {
			alert("Товар успешно обновлён");
		} else {
			alert("Ошибка обновления: " + res.status);
		}
		})
		.catch(err => {
		console.error("Ошибка сети:", err);
		alert("Ошибка соединения с сервером");
		});
	});


	saveWrapper.appendChild(saveBtn);
	wrapper.appendChild(saveWrapper);

	return wrapper;
};

function renderProducts(products) {
  const root = document.querySelector('.frame .div');
  document.querySelectorAll('.product-wrapper').forEach(el => el.remove());

  products.forEach((product, index) => {
    const card = createEmptyCard(product);

    const inner = card.querySelector('.div-2');
    if (inner) {
      inner.className = index % 2 === 0 ? 'div-2' : 'div-3';
    }

    root.appendChild(card);
  });
}



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
  try {
    const res = await fetch('http://localhost:8001/products', {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });

    if (!res.ok) {
      alert("Ошибка загрузки товаров: " + res.status);
      return;
    }

    const products = await res.json(); 

    renderProducts(products);

  } catch (err) {
    console.error("Ошибка сети:", err);
    alert("Ошибка соединения с сервером");
  };


  const createBtn = document.querySelector('.create-product-button');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      window.location.href = '../addProduct/index.html';
    });
  }

  const productsBtn = document.querySelector('.btn-products');
  if (productsBtn) {
    productsBtn.addEventListener('click', () => {
      window.location.href = '../allProducts/index.html';
    });
  }

  const ordersBtn = document.querySelector('.btn-orders');
  if (ordersBtn) {
    ordersBtn.addEventListener('click', () => {
      window.location.href = '../orders/index.html';
    });
  }

  const searchInput = document.querySelector('.img-12');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.product-wrapper').forEach(wrapper => {
        const name = wrapper.querySelector('.product-name')?.value.toLowerCase() || '';
        const desc = wrapper.querySelector('.input-long')?.value.toLowerCase() || '';
        const attrs = wrapper.querySelectorAll('.attribute-input');
        const attrValues = Array.from(attrs).map(input => input.value.toLowerCase()).join(' ');
        const matches = [name, desc, attrValues].some(text => text.includes(query));
        wrapper.style.display = matches ? 'flex' : 'none';
      });
    });
  }
});

document.querySelector('.img-12').addEventListener('input', function (e) {
	const query = e.target.value.toLowerCase();
	document.querySelectorAll('.product-wrapper').forEach(wrapper => {
		const name = wrapper.querySelector('.product-name')?.value.toLowerCase() || '';
		const desc = wrapper.querySelector('.input-long')?.value.toLowerCase() || '';
		const attrs = wrapper.querySelectorAll('.attribute-input');
		const attrValues = Array.from(attrs).map(input => input.value.toLowerCase()).join(' ');
		
		const matches = [name, desc, attrValues].some(text => text.includes(query));
		wrapper.style.display = matches ? 'flex' : 'none';
	});
});

document.getElementById('saveModal').addEventListener('click', () => {
	const url = document.getElementById('imageUrlInput').value.trim();
	const file = document.getElementById('imageFileInput').files[0];

	if (url && window._currentImageTarget && window._currentProductRef) {
		window._currentImageTarget.style.backgroundImage = `url('${url}')`;
		window._currentProductRef.image_url = url;
	} else if (file) {
		const reader = new FileReader();
		reader.onload = function (e) {
			if (window._currentImageTarget && window._currentProductRef) {
				window._currentImageTarget.style.backgroundImage = `url('${e.target.result}')`;
				window._currentProductRef.image_url = e.target.result;
			}
		};
		reader.readAsDataURL(file);
	}

	document.getElementById('imageModal').style.display = 'none';
	document.getElementById('imageUrlInput').value = '';
	document.getElementById('imageFileInput').value = '';
});

document.getElementById('cancelModal').addEventListener('click', () => {
	document.getElementById('imageModal').style.display = 'none';
	document.getElementById('imageUrlInput').value = '';
	document.getElementById('imageFileInput').value = '';
});

