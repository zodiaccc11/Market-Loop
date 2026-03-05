// API Base URL
const API_URL = 'https://market-loop-three.vercel.app/api/login';

// Global State
let currentUser = null;
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let qrCodeData = null;
let isAdmin = false;
let isCompanyUser = false;

// กำหนดสาขา (Branch) คงที่ 4 สาขา สำหรับผูกกับ companyId/companyName
const BRANCHES = [
    { id: 'branch1', name: 'สาขา 1' },
    { id: 'branch2', name: 'สาขา 2' },
    { id: 'branch3', name: 'สาขา 3' },
    { id: 'branch4', name: 'สาขา 4' }
];

function getBranchById(id) {
    return BRANCHES.find(b => b.id === id) || null;
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCategories();
    loadProducts();
    loadQRCode();
    updateCartUI();
    
    // Image preview handlers
    document.getElementById('productImage')?.addEventListener('change', (e) => {
        previewImage(e.target, 'imagePreview');
    });
    
    document.getElementById('editProductImage')?.addEventListener('change', (e) => {
        previewImage(e.target, 'editImagePreview');
    });
    
    document.getElementById('qrCodeImage')?.addEventListener('change', (e) => {
        previewImage(e.target, 'qrCodePreview');
    });
});

// ========== AUTHENTICATION ==========

function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        isAdmin = currentUser && currentUser.role === 'admin';
        isCompanyUser = currentUser && currentUser.role === 'company_user';
        updateAuthUI();
    }
}

function updateAuthUI() {
    const usernameSpan = document.getElementById('username');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const addProductBtn = document.getElementById('addProductBtn');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const qrCodeSettingsBtn = document.getElementById('qrCodeSettingsBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const productsNavBtn = document.getElementById('productsNavBtn');
    const categoriesNavBtn = document.getElementById('categoriesNavBtn');
    const cartNavBtn = document.getElementById('cartNavBtn');
    const categoriesDropdown = document.getElementById('categoriesDropdown');
    const withdrawalsNavBtn = document.getElementById('withdrawalsNavBtn');
    const myOrdersNavBtn = document.getElementById('myOrdersNavBtn');
    
    if (currentUser) {
        const roleLabel = isAdmin ? ' (Admin)' : (isCompanyUser ? ' (Company)' : '');
        usernameSpan.textContent = currentUser.username + roleLabel;
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // แสดงเมนูสินค้าและตะกร้าสำหรับผู้ที่ login แล้ว
        if (productsNavBtn) productsNavBtn.style.display = 'block';
        if (cartNavBtn) cartNavBtn.style.display = 'block';
        if (myOrdersNavBtn) myOrdersNavBtn.style.display = 'block';
        if (withdrawalsNavBtn) withdrawalsNavBtn.style.display = 'block';
        
        // แสดงปุ่มเฉพาะ Admin
        if (isAdmin) {
            addProductBtn.style.display = 'block';
            addCategoryBtn.style.display = 'block';
            qrCodeSettingsBtn.style.display = 'block';
            if (adminPanelBtn) adminPanelBtn.style.display = 'block';
            // แสดงเมนูหมวดหมู่ (dropdown)
            if (categoriesDropdown) categoriesDropdown.style.display = 'block';
        } else {
            addProductBtn.style.display = 'none';
            addCategoryBtn.style.display = 'none';
            qrCodeSettingsBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
            // ให้ company_user เห็น dropdown หมวดหมู่ แต่ user ทั่วไปไม่เห็น
            if (categoriesDropdown) categoriesDropdown.style.display = isCompanyUser ? 'block' : 'none';
        }
        
        // ซ่อนหน้า welcome และแสดงหน้า products
        const welcomeSection = document.getElementById('welcome');
        const productsSection = document.getElementById('products');
        if (welcomeSection) welcomeSection.classList.remove('active');
        if (productsSection) productsSection.classList.add('active');
    } else {
        usernameSpan.textContent = 'เข้าสู่ระบบ';
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        addProductBtn.style.display = 'none';
        addCategoryBtn.style.display = 'none';
        qrCodeSettingsBtn.style.display = 'none';
        if (adminPanelBtn) adminPanelBtn.style.display = 'none';
        
        // ซ่อนเมนูสินค้า หมวดหมู่ และตะกร้าสำหรับผู้ที่ยังไม่ login
        if (productsNavBtn) productsNavBtn.style.display = 'none';
        if (categoriesDropdown) categoriesDropdown.style.display = 'none';
        if (cartNavBtn) cartNavBtn.style.display = 'none';
        if (myOrdersNavBtn) myOrdersNavBtn.style.display = 'none';
        if (withdrawalsNavBtn) withdrawalsNavBtn.style.display = 'none';
        
        // แสดงหน้า welcome และซ่อนหน้าอื่นๆ
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        const welcomeSection = document.getElementById('welcome');
        if (welcomeSection) welcomeSection.classList.add('active');
    }
}

// ========== NAV DROPDOWN (CATEGORIES) ==========
function toggleCategoriesDropdown(e) {
    if (e) e.preventDefault();
    const menu = document.getElementById('categoriesDropdownMenu');
    if (!menu) return;
    menu.classList.toggle('show');
}

function closeCategoriesDropdown() {
    const menu = document.getElementById('categoriesDropdownMenu');
    if (!menu) return;
    menu.classList.remove('show');
}

// ปิด dropdown เมื่อคลิกนอก
document.addEventListener('click', (e) => {
    const dd = document.getElementById('categoriesDropdown');
    const menu = document.getElementById('categoriesDropdownMenu');
    if (!dd || !menu) return;
    if (!dd.contains(e.target)) {
        menu.classList.remove('show');
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) {
        console.error('Login form elements not found');
        showNotification('เกิดข้อผิดพลาด กรุณารีเฟรชหน้าเว็บ', 'error');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    console.log('Attempting login with email:', email);
    
    if (!email || !password) {
        showNotification('กรุณากรอกอีเมลและรหัสผ่าน', 'error');
        return;
    }
    
    try {
        const requestBody = { email, password };
        console.log('Sending login request:', { email, passwordLength: password.length });
        
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            showNotification('เกิดข้อผิดพลาด: Server ไม่ได้ส่งข้อมูล JSON', 'error');
            return;
        }
        
        console.log('Response data:', data);
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            isAdmin = data.user.role === 'admin';
            updateAuthUI();
            closeModal('loginModal');
            showNotification('เข้าสู่ระบบสำเร็จ', 'success');
            // แสดงหน้า products หลังจาก login
            showSection('products');
        } else {
            console.error('Login failed:', data);
            showNotification(data.error || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    
    // ตรวจสอบเบอร์มือถือ
    if (!phone || !/^[0-9]{9,10}$/.test(phone)) {
        showNotification('กรุณากรอกเบอร์มือถือให้ถูกต้อง (9-10 หลัก)', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        isAdmin = data.user.role === 'admin';
        updateAuthUI();
            closeModal('registerModal');
            showNotification('ลงทะเบียนสำเร็จ', 'success');
            // แสดงหน้า products หลังจาก login
            showSection('products');
        } else {
            showNotification(data.error || 'ลงทะเบียนไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    isAdmin = false;
    updateAuthUI();
    showNotification('ออกจากระบบสำเร็จ', 'success');
    // กลับไปหน้า products
    showSection('products');
}

// ========== MODAL FUNCTIONS ==========

function showLoginModal() {
    document.getElementById('loginModal').classList.add('show');
    closeUserMenu();
}

function showRegisterModal() {
    document.getElementById('registerModal').classList.add('show');
    closeUserMenu();
}

function showAddProductModal() {
    if (!currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    document.getElementById('addProductForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    populateCategorySelect('productCategory');
    document.getElementById('addProductModal').classList.add('show');
}

function showEditProductModal(product) {
    if (!currentUser || !isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductCost').value = product.cost || 0;
    document.getElementById('editProductImportCost').value = product.importCost || 0;
    document.getElementById('editProductStock').value = product.stock;
    populateCategorySelect('editProductCategory', product.categoryId);
    document.getElementById('editImagePreview').innerHTML = product.image 
        ? `<img src="${API_URL.replace('/api', '')}${product.image}" alt="${product.name}">` 
        : '';
    document.getElementById('editProductModal').classList.add('show');
}

function showAddCategoryModal() {
    if (!currentUser || !isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    document.getElementById('addCategoryForm').reset();
    document.getElementById('addCategoryModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

function closeUserMenu() {
    document.getElementById('userDropdown').classList.remove('show');
}

// Close modals when clicking outside
window.onclick = (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
    
    if (!e.target.closest('.user-menu')) {
        closeUserMenu();
    }
}

// ========== SECTION NAVIGATION ==========

function showSection(sectionId) {
    // ตรวจสอบว่าผู้ใช้ login แล้วหรือยัง
    if (!currentUser && sectionId !== 'welcome') {
        // ถ้ายังไม่ login และไม่ใช่หน้า welcome ให้แสดงหน้า welcome
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        sectionId = 'welcome';
    }
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    if (event && event.target) {
        const btn = event.target.closest('.nav-btn');
        if (btn) btn.style.background = 'rgba(255, 255, 255, 0.3)';
    }
    
    // Load admin data if needed
    if (sectionId === 'admin') {
        // ตรวจสอบ isAdmin อีกครั้ง
        if (currentUser) {
            isAdmin = currentUser.role === 'admin';
        }
        if (isAdmin) {
            loadAdminData();
        } else {
            showNotification('ต้องเป็น Admin เท่านั้น', 'error');
            showSection('products'); // กลับไปหน้า products
        }
    }

    // Load company user data
    if (sectionId === 'myOrders') {
        loadMyOrders();
    }
    if (sectionId === 'withdrawals') {
        loadWithdrawals();
    }
}

// ========== CATEGORIES ==========

async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        categories = await response.json();
        // รอให้ products โหลดเสร็จก่อน render
        if (products.length === 0) {
            await loadProducts();
        }
        renderCategories();
        renderCategoriesDropdown();
        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoriesDropdown() {
    const menu = document.getElementById('categoriesDropdownMenu');
    if (!menu) return;
    if (!Array.isArray(categories)) categories = [];

    const items = [
        `<button class="dropdown-item" onclick="selectCategoryFilter('')"><i class="fas fa-th-large"></i> ทั้งหมด</button>`,
        ...categories.map(c => `<button class="dropdown-item" onclick="selectCategoryFilter('${c.id}')"><i class="fas fa-utensils"></i> ${c.name}</button>`)
    ];

    menu.innerHTML = items.join('');
}

function selectCategoryFilter(categoryId) {
    const filter = document.getElementById('categoryFilter');
    if (filter) {
        filter.value = categoryId;
    }
    filterProducts();
    closeCategoriesDropdown();
    showSection('products');
}

function renderCategories() {
    const grid = document.getElementById('categoriesGrid');
    
    if (categories.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h3>ยังไม่มีหมวดหมู่</h3>
                <p>เริ่มต้นด้วยการเพิ่มหมวดหมู่ใหม่</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = categories.map(category => {
        // ตรวจสอบให้แน่ใจว่า products array มีข้อมูล
        const categoryProducts = (products || []).filter(p => p && p.categoryId === category.id);
        const productCount = categoryProducts.length;
        const totalStock = categoryProducts.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
        
        // Escape HTML เพื่อป้องกัน XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        return `
            <div class="category-card">
                <div class="category-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="category-name">${escapeHtml(category.name)}</div>
                <div class="category-description">${escapeHtml(category.description || 'ไม่มีรายละเอียด')}</div>
                <div style="color: var(--text-light); margin-bottom: 1rem;">
                    สินค้า: ${productCount} รายการ
                </div>
                ${totalStock > 0 ? `<div style="color: var(--text-light); margin-bottom: 1rem;">
                    สต็อกรวม: ${totalStock} ชิ้น
                </div>` : ''}
                ${categoryProducts.length > 0 ? `
                    <div style="margin-bottom: 1rem;">
                        <details style="cursor: pointer;" class="category-products-details">
                            <summary style="color: var(--primary-color); font-weight: 600; margin-bottom: 0.5rem; user-select: none;">
                                <i class="fas fa-store"></i> ดูสินค้าในหมวดหมู่ (${productCount})
                            </summary>
                            <div style="margin-top: 0.5rem; padding-left: 1rem; max-height: 200px; overflow-y: auto;" class="category-products-list">
                                ${categoryProducts.map(p => {
                                    const productName = escapeHtml(p.name || 'ไม่มีชื่อ');
                                    const productPrice = parseFloat(p.price || 0).toFixed(2);
                                    const productStock = parseInt(p.stock || 0);
                                    return `
                                        <div style="padding: 0.5rem; margin-bottom: 0.5rem; background: var(--bg-color); border-radius: 8px; border-left: 3px solid var(--primary-color);">
                                            <div style="font-weight: 600; color: var(--text-color);">${productName}</div>
                                            <div style="font-size: 0.875rem; color: var(--text-light);">
                                                ราคา: ฿${productPrice} | สต็อก: ${productStock} ชิ้น
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </details>
                    </div>
                ` : ''}
                ${isAdmin ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.id}')">
                        <i class="fas fa-trash"></i> ลบ
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function handleAddCategory(e) {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('addCategoryModal');
            loadCategories();
            showNotification('เพิ่มหมวดหมู่สำเร็จ', 'success');
        } else {
            const errorMsg = data.error || 'เพิ่มหมวดหมู่ไม่สำเร็จ';
            console.error('Add category error:', errorMsg, data);
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            loadCategories();
            loadProducts();
            showNotification('ลบหมวดหมู่สำเร็จ', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'ลบหมวดหมู่ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function populateCategorySelect(selectId, selectedId = null) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">ไม่มีหมวดหมู่</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        if (selectedId === category.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function populateCategoryFilter() {
    const filter = document.getElementById('categoryFilter');
    filter.innerHTML = '<option value="">ทั้งหมด</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        filter.appendChild(option);
    });
}

// ========== PRODUCTS ==========

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        // ตรวจสอบให้แน่ใจว่า products เป็น array
        if (!Array.isArray(products)) {
            products = [];
        }
        renderProducts();
        // อัปเดตหมวดหมู่หลังจากโหลดสินค้าเสร็จ
        if (categories.length > 0) {
            renderCategories();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        products = [];
    }
}

function renderProducts(filteredProducts = null) {
    const grid = document.getElementById('productsGrid');
    const productsToRender = filteredProducts || products;
    
    if (productsToRender.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store"></i>
                <h3>ยังไม่มีสินค้า</h3>
                <p>เริ่มต้นด้วยการเพิ่มสินค้าใหม่</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productsToRender.map(product => {
        const category = categories.find(c => c.id === product.categoryId);
        const stockClass = product.stock === 0 ? 'low' : product.stock < 10 ? 'low' : '';
        
        return `
            <div class="product-card">
                ${product.image ? 
                    `<img src="${API_URL.replace('/api', '')}${product.image}" alt="${product.name}" class="product-image">` :
                    `<div class="product-image-placeholder"><i class="fas fa-image"></i></div>`
                }
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description || 'ไม่มีรายละเอียด'}</div>
                    <div class="product-price">฿${product.price.toFixed(2)}</div>
                    <div class="product-stock ${stockClass}">
                        สต็อก: ${product.stock} ${product.stock === 0 ? '(หมด)' : product.stock < 10 ? '(เหลือน้อย)' : ''}
                    </div>
                    ${category ? `<div style="color: var(--text-light); font-size: 0.875rem; margin-bottom: 1rem;">
                        <i class="fas fa-utensils"></i> ${category.name}
                    </div>` : ''}
                    <div class="product-actions">
                        <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> เพิ่มลงตะกร้า
                        </button>
                        ${isAdmin ? `
                            <button class="btn btn-secondary btn-sm" onclick="showEditProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = products;
    
    if (categoryFilter) {
        filtered = filtered.filter(p => p.categoryId === categoryFilter);
    }
    
    if (searchInput) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchInput) ||
            (p.description && p.description.toLowerCase().includes(searchInput))
        );
    }
    
    renderProducts(filtered);
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('cost', document.getElementById('productCost').value || 0);
    formData.append('importCost', document.getElementById('productImportCost').value || 0);
    formData.append('stock', document.getElementById('productStock').value);
    formData.append('categoryId', document.getElementById('productCategory').value);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('addProductModal');
            loadProducts();
            showNotification('เพิ่มสินค้าสำเร็จ', 'success');
        } else {
            const errorMsg = data.error || 'เพิ่มสินค้าไม่สำเร็จ';
            console.error('Add product error:', errorMsg, data);
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('editProductName').value);
    formData.append('description', document.getElementById('editProductDescription').value);
    formData.append('price', document.getElementById('editProductPrice').value);
    formData.append('cost', document.getElementById('editProductCost').value || 0);
    formData.append('importCost', document.getElementById('editProductImportCost').value || 0);
    formData.append('stock', document.getElementById('editProductStock').value);
    formData.append('categoryId', document.getElementById('editProductCategory').value);
    
    const imageFile = document.getElementById('editProductImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editProductModal');
            loadProducts();
            showNotification('แก้ไขสินค้าสำเร็จ', 'success');
        } else {
            const errorMsg = data.error || 'แก้ไขสินค้าไม่สำเร็จ';
            console.error('Edit product error:', errorMsg, data);
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            // Remove from cart if exists
            cart = cart.filter(item => item.productId !== id);
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            loadProducts();
            showNotification('ลบสินค้าสำเร็จ', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'ลบสินค้าไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function previewImage(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) {
        console.warn(`Preview element with id "${previewId}" not found`);
        return;
    }
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ========== CART ==========

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock === 0) {
        showNotification('สินค้าหมด', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showNotification('ไม่สามารถเพิ่มจำนวนได้ เนื่องจากสต็อกไม่เพียงพอ', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            stock: product.stock,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showNotification('เพิ่มสินค้าลงตะกร้าสำเร็จ', 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showNotification('ลบสินค้าออกจากตะกร้า', 'success');
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.productId === productId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.stock) {
        showNotification('ไม่สามารถเพิ่มจำนวนได้ เนื่องจากสต็อกไม่เพียงพอ', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    // Update cart badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartBadge').textContent = totalItems;
    
    // Render cart items
    renderCart();
    
    // Update summary
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalPrice').textContent = `฿${totalPrice.toFixed(2)}`;
}

function renderCart() {
    const container = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-basket"></i>
                <h3>ตะกร้าว่าง</h3>
                <p>เพิ่มสินค้าลงตะกร้าเพื่อเริ่มช้อปปิ้ง</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cart.map(item => {
        return `
            <div class="cart-item">
                ${item.image ? 
                    `<img src="${API_URL.replace('/api', '')}${item.image}" alt="${item.name}" class="cart-item-image">` :
                    `<div class="cart-item-image-placeholder"><i class="fas fa-image"></i></div>`
                }
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">฿${item.price.toFixed(2)} ต่อชิ้น</div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="quantity-input" value="${item.quantity}" 
                                   onchange="updateCartQuantityInput('${item.productId}', this.value)" min="1" max="${item.stock}">
                            <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div style="font-weight: 600; color: var(--primary-color);">
                            ฿${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="removeFromCart('${item.productId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateCartQuantityInput(productId, value) {
    const quantity = parseInt(value);
    const item = cart.find(item => item.productId === productId);
    if (!item || quantity <= 0) {
        removeFromCart(productId);
        return;
    }
    if (quantity > item.stock) {
        showNotification('ไม่สามารถเพิ่มจำนวนได้ เนื่องจากสต็อกไม่เพียงพอ', 'error');
        updateCartUI();
        return;
    }
    item.quantity = quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function checkout() {
    if (cart.length === 0) {
        showNotification('ตะกร้าว่าง', 'error');
        return;
    }
    
    // แสดง QR Code Modal
    showPaymentQRModal();
}

function showPaymentQRModal() {
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // แสดงรายการสินค้า
    const paymentItems = document.getElementById('paymentItems');
    if (paymentItems) {
    paymentItems.innerHTML = cart.map(item => `
        <div class="payment-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>฿${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    }
    
    const paymentTotalPrice = document.getElementById('paymentTotalPrice');
    if (paymentTotalPrice) {
        paymentTotalPrice.textContent = `฿${totalPrice.toFixed(2)}`;
    }
    
    // แสดง QR Code
    const qrContainer = document.getElementById('qrCodeContainer');
    const qrMessage = document.getElementById('qrCodeMessageText');
    
    if (qrContainer) {
    if (qrCodeData && qrCodeData.image) {
        qrContainer.innerHTML = `
            <img src="${API_URL.replace('/api', '')}${qrCodeData.image}" alt="QR Code ชำระเงิน" style="max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: var(--shadow-lg); background: white; padding: 1rem;">
        `;
            if (qrMessage) {
        qrMessage.textContent = qrCodeData.message || 'กรุณาสแกน QR Code เพื่อชำระเงิน';
            }
    } else {
        qrContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-qrcode" style="font-size: 4rem; color: var(--text-light); margin-bottom: 1rem;"></i>
                <h3>ยังไม่มี QR Code</h3>
                <p>กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่ม QR Code</p>
            </div>
        `;
            if (qrMessage) {
        qrMessage.textContent = '';
            }
        }
    }
    
    document.getElementById('paymentQRModal').classList.add('show');
}

async function confirmPayment() {
    if (cart.length === 0) {
        showNotification('ตะกร้าว่าง', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
            return;
        }
        
        const items = cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity
        }));
        
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ items })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            
            const message = `ยืนยันการชำระเงินสำเร็จ!\n\n` +
                `หมายเลขคำสั่งซื้อ: ${data.orderId}\n` +
                `จำนวนสินค้า: ${totalItems} ชิ้น\n` +
                `ราคารวม: ฿${totalPrice.toFixed(2)}\n\n` +
                `ขอบคุณที่ใช้บริการ Market!`;
            
            alert(message);
            
            // Clear cart
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
            closeModal('paymentQRModal');
            loadProducts(); // โหลดสินค้าใหม่เพื่ออัปเดต stock
            showNotification('สั่งซื้อสำเร็จ!', 'success');
        } else {
            showNotification(data.error || 'ไม่สามารถสั่งซื้อได้', 'error');
            if (data.details && data.details.length > 0) {
                alert('รายละเอียด:\n' + data.details.join('\n'));
            }
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// ========== MY ORDERS (COMPANY USER) ==========

async function loadMyOrders() {
    if (!currentUser) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            showNotification(data.error || 'โหลดคำสั่งซื้อไม่สำเร็จ', 'error');
            return;
        }
        const orders = await response.json();
        renderMyOrders(orders);
        await loadMyHistory();
    } catch (error) {
        console.error(error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function renderMyOrders(orders) {
    const container = document.getElementById('myOrdersList');
    if (!container) return;
    if (!Array.isArray(orders) || orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-truck"></i><h3>ยังไม่มีคำสั่งซื้อ</h3></div>';
        return;
    }

    const statusLabels = {
        pending: 'รอดำเนินการ',
        unpaid: 'ค้างชำระ',
        awaiting_delivery: 'รอการส่งมอบ',
        completed: 'เสร็จสมบูรณ์',
        cancelled: 'ยกเลิก'
    };
    const deliveryLabels = {
        pending: 'รอจัดเตรียม',
        preparing: 'กำลังเตรียม',
        shipped: 'กำลังจัดส่ง',
        delivered: 'ส่งมอบแล้ว'
    };

    container.innerHTML = orders.map(o => {
        const d = new Date(o.createdAt);
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${o.orderNumber}</h4>
                        <span class="badge badge-primary">${statusLabels[o.status] || o.status}</span>
                        <span class="badge badge-info"><i class="fas fa-truck"></i> ${deliveryLabels[o.deliveryStatus] || o.deliveryStatus}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${d.toLocaleString('th-TH')}
                        </div>
                        <div style="font-weight: 700; color: var(--primary-color);">
                            ฿${parseFloat(o.totalPrice || 0).toFixed(2)}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="showOrderDetails('${o.id}')">
                            <i class="fas fa-eye"></i> รายละเอียด
                        </button>
                        ${o.status !== 'completed' && o.status !== 'cancelled' ? `
                            <button class="btn btn-success btn-sm" onclick="confirmReceived('${o.id}')">
                                <i class="fas fa-check"></i> ยืนยันได้รับสินค้า
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="cancelMyOrder('${o.id}')">
                                <i class="fas fa-times"></i> ยกเลิกสินค้า
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function confirmReceived(orderId) {
    if (!confirm('ยืนยันว่าได้รับสินค้าแล้ว?')) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/orders/${orderId}/confirm-received`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            showNotification('ยืนยันรับสินค้าสำเร็จ', 'success');
            loadMyOrders();
        } else {
            showNotification(data.error || 'ยืนยันรับสินค้าไม่สำเร็จ', 'error');
        }
    } catch (e) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function cancelMyOrder(orderId) {
    const reason = prompt('ระบุเหตุผลที่ยกเลิก (ไม่บังคับ):', '');
    if (reason === null) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            showNotification('ยกเลิกสินค้าเรียบร้อย', 'success');
            loadMyOrders();
        } else {
            showNotification(data.error || 'ยกเลิกสินค้าไม่สำเร็จ', 'error');
        }
    } catch (e) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function loadMyHistory() {
    // รวมประวัติ: withdrawals + orders (สำหรับผู้ใช้ปัจจุบัน)
    const container = document.getElementById('myHistoryList');
    if (!container) return;
    try {
        const token = localStorage.getItem('token');
        const [ordersRes, wdRes] = await Promise.all([
            fetch(`${API_URL}/orders`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/withdrawals`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        const wds = wdRes.ok ? await wdRes.json() : [];
        renderMyHistory(orders, wds);
    } catch (e) {
        container.innerHTML = '<div style="color: var(--text-light);">โหลดประวัติไม่สำเร็จ</div>';
    }
}

function renderMyHistory(orders, withdrawals) {
    const container = document.getElementById('myHistoryList');
    if (!container) return;
    const rows = [];

    (withdrawals || []).forEach(w => {
        const d = new Date(w.withdrawnAt || w.createdAt);
        const status = w.status || 'pending';
        const statusLabel = status === 'shipping'
            ? 'สินค้ากำลังจัดส่ง'
            : status === 'delivered'
                ? 'สินค้าถึงที่หมายแล้ว'
                : status === 'received'
                    ? 'ได้รับสินค้าแล้ว'
                    : 'รอดำเนินการ';
        rows.push({
            type: 'withdrawal',
            date: d,
            html: `<tr>
                <td>เบิกสินค้า</td>
                <td>${d.toLocaleString('th-TH')}</td>
                <td>${w.productCode}</td>
                <td>${w.productName}</td>
                <td>${w.quantity}</td>
                <td>${statusLabel}${w.trackingCode ? ' (' + w.trackingCode + ')' : ''}</td>
                <td>฿${parseFloat(w.totalAmount || 0).toFixed(2)}</td>
            </tr>`
        });
    });

    (orders || []).forEach(o => {
        const d = new Date(o.createdAt);
        (o.items || []).forEach(it => {
            rows.push({
                type: 'order',
                date: d,
                html: `<tr>
                    <td>สั่งซื้อ</td>
                    <td>${d.toLocaleString('th-TH')}</td>
                    <td>-</td>
                    <td>${it.productName}</td>
                    <td>${it.quantity}</td>
                    <td>฿${parseFloat(it.price || 0).toFixed(2)}</td>
                    <td>฿${parseFloat(it.totalPrice || 0).toFixed(2)}</td>
                </tr>`
            });
        });
    });

    rows.sort((a, b) => b.date - a.date);

    if (rows.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>ยังไม่มีประวัติ</h3></div>';
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ประเภท</th>
                    <th>วันเวลา</th>
                    <th>รหัสสินค้า</th>
                    <th>ชื่อสินค้า</th>
                    <th>จำนวน</th>
                    <th>ราคา/หน่วย</th>
                    <th>รวม</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => r.html).join('')}
            </tbody>
        </table>
    `;
}

// ========== WITHDRAWALS UI ==========

let withdrawals = [];

function showWithdrawalModal() {
    if (!currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        return;
    }
    // เติม dropdown สินค้าจาก products
    const sel = document.getElementById('withdrawProductId');
    if (sel) {
        sel.innerHTML = `<option value="">ไม่เลือก</option>` + (products || []).map(p => `<option value="${p.id}">${p.name} (เหลือ ${p.stock})</option>`).join('');
    }
    // เติมชื่อบริษัทจาก user ถ้ามี
    const companyInput = document.getElementById('withdrawCompanyName');
    if (companyInput && currentUser.companyName) companyInput.value = currentUser.companyName;

    document.getElementById('withdrawalForm')?.reset?.();
    // reset ทำให้ค่า companyName หาย -> ตั้งใหม่อีกที
    if (companyInput && currentUser.companyName) companyInput.value = currentUser.companyName;

    document.getElementById('withdrawalModal').classList.add('show');
}

async function loadWithdrawals() {
    if (!currentUser) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/withdrawals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            showNotification(data.error || 'โหลดรายการเบิกสินค้าไม่สำเร็จ', 'error');
            return;
        }
        withdrawals = await response.json();
        renderWithdrawals();
    } catch (e) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function renderWithdrawals() {
    const container = document.getElementById('withdrawalsList');
    if (!container) return;
    if (!Array.isArray(withdrawals) || withdrawals.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>ยังไม่มีการเบิกสินค้า</h3></div>';
        return;
    }

    container.innerHTML = withdrawals.map(w => {
        const d = new Date(w.withdrawnAt || w.createdAt);
        const status = w.status || 'pending';
        const statusLabel = status === 'shipping'
            ? 'สินค้ากำลังจัดส่ง'
            : status === 'delivered'
                ? 'สินค้าถึงที่หมายแล้ว'
                : status === 'received'
                    ? 'ได้รับสินค้าแล้ว'
                    : 'รอดำเนินการ';
        const statusClass = status === 'shipping'
            ? 'badge-info'
            : status === 'delivered'
                ? 'badge-warning'
                : status === 'received'
                    ? 'badge-success'
                    : 'badge-pending';

        let actionsHtml = '';
        if (isAdmin) {
            // สำหรับ Admin: เลือกสถานะจาก dropdown แล้วกดปุ่มอัปเดต
            const selectId = `withdrawal-status-${w.id}`;
            actionsHtml = `
                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                    <select id="${selectId}" class="admin-select">
                        <option value="pending" ${status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                        <option value="shipping" ${status === 'shipping' ? 'selected' : ''}>สินค้ากำลังจัดส่ง</option>
                        <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>สินค้าถึงที่หมายแล้ว</option>
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="updateWithdrawalStatusFromSelect('${w.id}', '${selectId}')">
                        อัปเดตสถานะ
                    </button>
                </div>
            `;
        } else if (isCompanyUser && status === 'delivered') {
            // ปุ่มสำหรับ User สาขา เพื่อยืนยันรับสินค้า
            actionsHtml = `
                <div style="margin-top: 0.5rem;">
                    <button class="btn btn-success btn-sm" onclick="updateWithdrawalStatus('${w.id}', 'received')">
                        ยืนยันได้รับสินค้าแล้ว
                    </button>
                </div>
            `;
        }

        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${w.productName}</h4>
                        <span class="badge badge-info">${w.companyName}</span>
                        <span class="badge badge-primary">รหัส: ${w.productCode}</span>
                        ${w.trackingCode ? `<span class="badge badge-secondary">พัสดุ: ${w.trackingCode}</span>` : ''}
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;"><i class="fas fa-clock"></i> ${d.toLocaleString('th-TH')}</div>
                        <div style="font-weight: 700; color: var(--primary-color);">฿${parseFloat(w.totalAmount || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div class="history-items">
                    <div><strong>จำนวน:</strong> ${w.quantity} | <strong>ราคา/หน่วย:</strong> ฿${parseFloat(w.withdrawPrice || 0).toFixed(2)}</div>
                    <div style="color: var(--text-light); margin-top: 0.25rem;"><i class="fas fa-user"></i> ${w.withdrawnByUsername || ''}</div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }).join('');
}

async function updateWithdrawalStatus(id, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/withdrawals/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            showNotification('อัปเดตสถานะการจัดส่งสำเร็จ', 'success');
            await loadWithdrawals();
            await loadMyHistory();
        } else {
            showNotification(data.error || 'อัปเดตสถานะไม่สำเร็จ', 'error');
        }
    } catch (e) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function updateWithdrawalStatusFromSelect(id, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const status = select.value;
    updateWithdrawalStatus(id, status);
}

async function handleWithdrawal(e) {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        const payload = {
            companyName: document.getElementById('withdrawCompanyName').value,
            productCode: document.getElementById('withdrawProductCode').value,
            productName: document.getElementById('withdrawProductName').value,
            quantity: document.getElementById('withdrawQuantity').value,
            withdrawPrice: document.getElementById('withdrawPrice').value,
            productId: document.getElementById('withdrawProductId').value || null
        };

        const response = await fetch(`${API_URL}/withdrawals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
            closeModal('withdrawalModal');
            showNotification('เบิกสินค้าสำเร็จ', 'success');
            await loadProducts();
            await loadWithdrawals();
            await loadMyHistory();
        } else {
            showNotification(data.error || 'เบิกสินค้าไม่สำเร็จ', 'error');
        }
    } catch (err) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// ========== QR CODE MANAGEMENT ==========

async function loadQRCode() {
    try {
        const response = await fetch(`${API_URL}/qrcode`);
        if (!response.ok) {
            // ถ้า response ไม่ ok ให้ set เป็น null
            qrCodeData = { image: null, message: null };
            return;
        }
        qrCodeData = await response.json();
        updateQRCodePreview();
    } catch (error) {
        console.error('Error loading QR code:', error);
        qrCodeData = { image: null, message: null };
    }
}

function updateQRCodePreview() {
    const preview = document.getElementById('currentQRCode');
    if (!preview) {
        console.warn('currentQRCode element not found');
        return;
    }
    
    if (qrCodeData && qrCodeData.image) {
        preview.innerHTML = `
            <p style="margin-bottom: 0.5rem; color: var(--text-light);">QR Code ปัจจุบัน:</p>
            <img src="${API_URL.replace('/api', '')}${qrCodeData.image}" alt="QR Code" style="max-width: 200px; border-radius: 8px; box-shadow: var(--shadow);">
        `;
        if (qrCodeData.message) {
            const qrCodeMessage = document.getElementById('qrCodeMessage');
            if (qrCodeMessage) {
                qrCodeMessage.value = qrCodeData.message;
            }
        }
    } else {
        preview.innerHTML = '<p style="color: var(--text-light);">ยังไม่มี QR Code</p>';
    }
}

function showQRCodeSettingsModal() {
    if (!currentUser || !isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    loadQRCode();
    document.getElementById('qrCodeSettingsModal').classList.add('show');
}

async function handleUploadQRCode(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const imageFile = document.getElementById('qrCodeImage').files[0];
    const message = document.getElementById('qrCodeMessage').value;
    
    console.log('QR Code upload - File:', imageFile);
    console.log('QR Code upload - Message:', message);
    
    // อนุญาตให้อัปโหลดเฉพาะไฟล์หรือเฉพาะข้อความก็ได้
    // ไม่ต้องบังคับให้มีทั้งสองอย่าง
    
    if (imageFile) {
        formData.append('qrcode', imageFile);
        console.log('QR Code file appended to FormData');
    }
    if (message) {
        formData.append('message', message);
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
            return;
        }
        
        console.log('Sending QR Code upload request...');
        const response = await fetch(`${API_URL}/qrcode`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`
                // ไม่ต้องตั้ง Content-Type สำหรับ FormData - browser จะตั้งให้อัตโนมัติ
            },
            body: formData
        });
        
        console.log('QR Code upload response status:', response.status);
        console.log('QR Code upload response ok:', response.ok);
        
        // ตรวจสอบ status code ก่อนอ่าน response body
        const isSuccess = response.status >= 200 && response.status < 300;
        const contentType = response.headers.get('content-type');
        
        let data;
        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = text ? { message: text } : null;
            }
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            // ถ้า status เป็น success แต่ parse ไม่ได้ ให้ถือว่าสำเร็จ
            if (isSuccess) {
                showNotification('อัปโหลด QR Code สำเร็จ', 'success');
                loadQRCode(); // โหลดข้อมูลใหม่
                closeModal('qrCodeSettingsModal');
                return;
            }
            showNotification('เกิดข้อผิดพลาดในการอ่านข้อมูล', 'error');
            return;
        }
        
        // ตรวจสอบว่าสำเร็จหรือไม่
        if (isSuccess && !data.error) {
            console.log('QR Code upload success data:', data);
            qrCodeData = data;
            updateQRCodePreview();
            // รีเซ็ต form
            const qrCodeForm = document.getElementById('qrCodeForm');
            const qrCodePreview = document.getElementById('qrCodePreview');
            if (qrCodeForm) {
                qrCodeForm.reset();
            }
            if (qrCodePreview) {
                qrCodePreview.innerHTML = '';
            }
            closeModal('qrCodeSettingsModal');
            showNotification('อัปโหลด QR Code สำเร็จ', 'success');
        } else {
            // Error case
            console.error('QR Code upload error:', data);
            const errorMsg = data?.error || data?.message || 'อัปโหลด QR Code ไม่สำเร็จ';
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        console.error('QR Code upload exception:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message, 'error');
    }
}

// ========== NOTIFICATIONS ==========

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideInRight 0.3s;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== REPORT PROBLEM ==========

function showReportModal() {
    if (!currentUser) {
        showNotification('กรุณาเข้าสู่ระบบก่อน', 'error');
        showLoginModal();
        return;
    }
    document.getElementById('reportForm').reset();
    document.getElementById('reportModal').classList.add('show');
}

async function handleReport(e) {
    e.preventDefault();
    
    const title = document.getElementById('reportTitle').value;
    const description = document.getElementById('reportDescription').value;
    const type = document.getElementById('reportType').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description, type })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('reportModal');
            showNotification('ส่งรายงานสำเร็จ ขอบคุณที่แจ้งปัญหา', 'success');
        } else {
            showNotification(data.error || 'ส่งรายงานไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// ========== ADMIN PANEL ==========

async function loadAdminData() {
    // ตรวจสอบ isAdmin อีกครั้ง
    if (!currentUser) {
        console.log('No current user');
        return;
    }
    
    if (!isAdmin && currentUser.role !== 'admin') {
        console.log('Not admin. Current role:', currentUser.role);
        return;
    }
    
    // อัปเดต isAdmin
    isAdmin = currentUser.role === 'admin';
    
    if (!isAdmin) {
        console.log('User is not admin');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            return;
        }
        
        // Load stats
        const statsResponse = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!statsResponse.ok) {
            const errorData = await statsResponse.json();
            console.error('Failed to load stats:', errorData);
            return;
        }
        
        const stats = await statsResponse.json();
        renderAdminStats(stats);
        
        // Load all data
        const dataResponse = await fetch(`${API_URL}/admin/data`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!dataResponse.ok) {
            const errorData = await dataResponse.json();
            console.error('Failed to load admin data:', errorData);
            return;
        }
        
        const data = await dataResponse.json();
        renderAdminUsers(data.users);
        renderAdminProducts(data.products);
        renderAdminReports(data.reports);
        
        // Load historical data
        loadHistoryData();
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function renderAdminStats(stats) {
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" style="background: var(--primary-color);">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.totalUsers}</div>
                <div class="stat-label">ผู้ใช้ทั้งหมด</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: var(--secondary-color);">
                <i class="fas fa-store"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.totalProducts}</div>
                <div class="stat-label">สินค้าทั้งหมด</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: var(--success-color);">
                <i class="fas fa-utensils"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.totalCategories}</div>
                <div class="stat-label">หมวดหมู่</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: var(--warning-color);">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.pendingReports}</div>
                <div class="stat-label">รายงานรอตรวจสอบ</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: var(--danger-color);">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.lowStockProducts}</div>
                <div class="stat-label">สินค้าเหลือน้อย</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #dc2626;">
                <i class="fas fa-times-circle"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.outOfStockProducts}</div>
                <div class="stat-label">สินค้าหมด</div>
            </div>
        </div>
    `;
}

function renderAdminUsers(users) {
    const list = document.getElementById('usersList');
    if (!list) return;
    
    list.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button class="btn btn-primary" onclick="showAddUserModal()">
                <i class="fas fa-plus"></i> สร้างผู้ใช้ใหม่
            </button>
        </div>
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ชื่อผู้ใช้</th>
                    <th>อีเมล</th>
                    <th>บทบาท</th>
                    <th>สาขา</th>
                    <th>วันที่สมัคร</th>
                    <th>จัดการ</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="badge ${user.role === 'admin' ? 'badge-admin' : (user.role === 'company_user' ? 'badge-info' : 'badge-user')}">
                            ${user.role === 'admin' ? 'Admin' : (user.role === 'company_user' ? 'User สาขา' : 'User')}
                        </span></td>
                        <td>${user.companyName || '-'}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString('th-TH')}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="showEditUserModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                                <i class="fas fa-edit"></i> แก้ไข
                            </button>
                            ${user.id !== currentUser.id ? `
                                <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')">
                                    <i class="fas fa-trash"></i> ลบ
                                </button>
                            ` : '<span style="color: var(--text-light);">ไม่สามารถลบตัวเองได้</span>'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderAdminProducts(products) {
    const list = document.getElementById('productsList');
    list.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ชื่อสินค้า</th>
                    <th>ราคา</th>
                    <th>สต็อก</th>
                    <th>หมวดหมู่</th>
                    <th>วันที่สร้าง</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => {
                    const category = categories.find(c => c.id === product.categoryId);
                    return `
                        <tr>
                            <td>${product.name}</td>
                            <td>฿${product.price.toFixed(2)}</td>
                            <td><span class="badge ${product.stock === 0 ? 'badge-danger' : product.stock < 10 ? 'badge-warning' : 'badge-success'}">${product.stock}</span></td>
                            <td>${category ? category.name : '-'}</td>
                            <td>${new Date(product.createdAt).toLocaleDateString('th-TH')}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderAdminReports(reports) {
    const list = document.getElementById('reportsList');
    if (reports.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>ยังไม่มีรายงาน</h3></div>';
        return;
    }
    
    list.innerHTML = reports.map(report => `
        <div class="report-card">
            <div class="report-header">
                <div>
                    <h4>${report.title}</h4>
                    <span class="badge badge-${report.type}">${getReportTypeLabel(report.type)}</span>
                    <span class="badge badge-${report.status}">${getReportStatusLabel(report.status)}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary" onclick="updateReportStatus('${report.id}', 'resolved')" ${report.status === 'resolved' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> แก้ไขแล้ว
                    </button>
                </div>
            </div>
            <p>${report.description}</p>
            <div class="report-footer">
                <span><i class="fas fa-user"></i> ${report.username}</span>
                <span><i class="fas fa-clock"></i> ${new Date(report.createdAt).toLocaleString('th-TH')}</span>
            </div>
        </div>
    `).join('');
}

function getReportTypeLabel(type) {
    const labels = {
        general: 'ทั่วไป',
        product: 'สินค้า',
        payment: 'การชำระเงิน',
        technical: 'เทคนิค',
        other: 'อื่นๆ'
    };
    return labels[type] || type;
}

function getReportStatusLabel(status) {
    const labels = {
        pending: 'รอตรวจสอบ',
        resolved: 'แก้ไขแล้ว',
        rejected: 'ปฏิเสธ'
    };
    return labels[status] || status;
}

async function updateReportStatus(id, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadAdminData();
            showNotification('อัปเดตสถานะรายงานสำเร็จ', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'อัปเดตสถานะไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    // Load data when specific tabs are opened
    if (tab === 'history') {
        loadHistoryData();
    } else if (tab === 'orders') {
        loadOrders();
    } else if (tab === 'invoices') {
        loadInvoices();
    } else if (tab === 'profit') {
        loadProfitReport();
    }
}

// ========== HISTORY MANAGEMENT ==========

async function loadHistoryData() {
    if (!currentUser || !isAdmin) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        const response = await fetch(`${API_URL}/admin/history/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to load history data:', errorData);
            return;
        }
        
        const data = await response.json();
        renderSalesHistory(data.sales || []);
        renderAdditionsHistory(data.additions || []);
        renderDeletionsHistory(data.deletions || []);
    } catch (error) {
        console.error('Error loading history data:', error);
    }
}

function showHistoryTab(tab) {
    document.querySelectorAll('.history-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.history-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`history${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
}

function renderSalesHistory(sales) {
    const list = document.getElementById('salesHistoryList');
    if (!list) return;
    
    if (sales.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>ยังไม่มีประวัติการขาย</h3></div>';
        return;
    }
    
    list.innerHTML = sales.map(sale => {
        const saleDate = new Date(sale.saleDate || sale.createdAt);
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>คำสั่งซื้อ #${sale.orderId}</h4>
                        <span class="badge badge-success">${sale.totalItems} รายการ</span>
                        <span class="badge badge-primary">฿${parseFloat(sale.totalPrice).toFixed(2)}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-user"></i> ${sale.username || 'ไม่ระบุ'}
                        </div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${saleDate.toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <h5>รายการสินค้า:</h5>
                    <ul style="list-style: none; padding: 0; margin: 0.5rem 0;">
                        ${sale.items.map(item => `
                            <li style="padding: 0.5rem; margin-bottom: 0.25rem; background: var(--bg-color); border-radius: 4px;">
                                <strong>${item.productName}</strong> x ${item.quantity} = ฿${parseFloat(item.totalPrice).toFixed(2)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }).join('');
}

function renderAdditionsHistory(additions) {
    const list = document.getElementById('additionsHistoryList');
    if (!list) return;
    
    if (additions.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-plus-circle"></i><h3>ยังไม่มีประวัติการเพิ่มสินค้า</h3></div>';
        return;
    }
    
    list.innerHTML = additions.map(addition => {
        const additionDate = new Date(addition.additionDate || addition.createdAt);
        const category = categories.find(c => c.id === addition.categoryId);
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${addition.productName}</h4>
                        <span class="badge badge-success">เพิ่มแล้ว</span>
                        ${category ? `<span class="badge badge-info">${category.name}</span>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-user"></i> ${addition.addedByUsername || 'ไม่ระบุ'}
                        </div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${additionDate.toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                        <div>
                            <strong>ราคา:</strong> ฿${parseFloat(addition.price).toFixed(2)}
                        </div>
                        <div>
                            <strong>สต็อก:</strong> ${addition.stock} ชิ้น
                        </div>
                        <div>
                            <strong>Product ID:</strong> ${addition.productId}
                        </div>
                    </div>
                    ${addition.productDescription ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-color); border-radius: 4px;">
                            <strong>รายละเอียด:</strong> ${addition.productDescription}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderDeletionsHistory(deletions) {
    const list = document.getElementById('deletionsHistoryList');
    if (!list) return;
    
    if (deletions.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-trash"></i><h3>ยังไม่มีประวัติการลบสินค้า</h3></div>';
        return;
    }
    
    list.innerHTML = deletions.map(deletion => {
        const deletionDate = new Date(deletion.deletionDate || deletion.createdAt);
        const category = categories.find(c => c.id === deletion.categoryId);
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${deletion.productName}</h4>
                        <span class="badge badge-danger">ลบแล้ว</span>
                        ${category ? `<span class="badge badge-info">${category.name}</span>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-user"></i> ${deletion.deletedByUsername || 'ไม่ระบุ'}
                        </div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${deletionDate.toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                        <div>
                            <strong>ราคา:</strong> ฿${parseFloat(deletion.price).toFixed(2)}
                        </div>
                        <div>
                            <strong>สต็อก (ก่อนลบ):</strong> ${deletion.stock} ชิ้น
                        </div>
                        <div>
                            <strong>Product ID:</strong> ${deletion.productId}
                        </div>
                    </div>
                    ${deletion.productDescription ? `
                        <div style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-color); border-radius: 4px;">
                            <strong>รายละเอียด:</strong> ${deletion.productDescription}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========== USER MANAGEMENT (ADMIN) ==========

function showAddUserModal() {
    if (!currentUser || !isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserModal').classList.add('show');
}

function showEditUserModal(user) {
    if (!currentUser || !isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserUsername').value = user.username;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    const editCompanySelect = document.getElementById('editUserCompanyId');
    if (editCompanySelect) {
        editCompanySelect.value = user.companyId || '';
    }
    document.getElementById('editUserPassword').value = '';
    document.getElementById('editUserModal').classList.add('show');
}

async function handleAddUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUserUsername').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const companyId = document.getElementById('newUserCompanyId').value || null;
    const branch = companyId ? getBranchById(companyId) : null;
    const companyName = branch ? branch.name : null;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, email, password, role, companyId, companyName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('addUserModal');
            loadAdminData();
            showNotification('สร้างผู้ใช้สำเร็จ', 'success');
        } else {
            showNotification(data.error || 'สร้างผู้ใช้ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Add user error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUserUsername').value;
    const email = document.getElementById('editUserEmail').value;
    const password = document.getElementById('editUserPassword').value;
    const role = document.getElementById('editUserRole').value;
    const companyId = document.getElementById('editUserCompanyId').value || null;
    const branch = companyId ? getBranchById(companyId) : null;
    const companyName = branch ? branch.name : null;
    
    const updateData = { username, email, role, companyId, companyName };
    if (password && password.trim() !== '') {
        updateData.password = password;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('editUserModal');
            loadAdminData();
            showNotification('แก้ไขผู้ใช้สำเร็จ', 'success');
            
            // ถ้าแก้ไขตัวเอง ให้อัปเดตข้อมูลใน localStorage
            if (userId === currentUser.id) {
                currentUser = { ...currentUser, username, email, role, companyId, companyName };
                isAdmin = role === 'admin';
                localStorage.setItem('user', JSON.stringify(currentUser));
                updateAuthUI();
            }
        } else {
            showNotification(data.error || 'แก้ไขผู้ใช้ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Edit user error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadAdminData();
            showNotification('ลบผู้ใช้สำเร็จ', 'success');
        } else {
            showNotification(data.error || 'ลบผู้ใช้ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}


// ========== ORDER MANAGEMENT ==========

let orders = [];

async function loadOrders() {
    if (!currentUser) return;
    
    try {
        const token = localStorage.getItem('token');
        const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
        const paymentFilter = document.getElementById('orderPaymentFilter')?.value || '';
        
        let url = `${API_URL}/orders`;
        const params = [];
        if (statusFilter) params.push(`status=${statusFilter}`);
        if (paymentFilter) params.push(`paymentStatus=${paymentFilter}`);
        if (params.length > 0) url += '?' + params.join('&');
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            orders = await response.json();
            renderOrders();
        } else {
            console.error('Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderOrders() {
    const list = document.getElementById('ordersList');
    if (!list) return;
    
    if (orders.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h3>ยังไม่มีคำสั่งซื้อ</h3></div>';
        return;
    }
    
    list.innerHTML = orders.map(order => {
        const orderDate = new Date(order.createdAt);
        const statusLabels = {
            pending: 'รอดำเนินการ',
            unpaid: 'ค้างชำระ',
            awaiting_delivery: 'รอการส่งมอบ',
            completed: 'เสร็จสมบูรณ์',
            cancelled: 'ยกเลิก'
        };
        const paymentLabels = {
            unpaid: 'ยังไม่ชำระ',
            partial: 'ชำระบางส่วน',
            paid: 'ชำระแล้ว'
        };
        const statusColors = {
            pending: 'badge-warning',
            unpaid: 'badge-danger',
            awaiting_delivery: 'badge-info',
            completed: 'badge-success',
            cancelled: 'badge-danger'
        };
        
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${order.orderNumber}</h4>
                        <span class="badge ${statusColors[order.status] || 'badge-warning'}">${statusLabels[order.status] || order.status}</span>
                        <span class="badge ${order.paymentStatus === 'paid' ? 'badge-success' : order.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger'}">${paymentLabels[order.paymentStatus] || order.paymentStatus}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-user"></i> ${order.username || 'ไม่ระบุ'}
                        </div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${orderDate.toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                        <div>
                            <strong>ยอดรวม:</strong> ฿${parseFloat(order.totalPrice).toFixed(2)}
                        </div>
                        <div>
                            <strong>ต้นทุน:</strong> ฿${parseFloat(order.totalCost || 0).toFixed(2)}
                        </div>
                        <div>
                            <strong>ต้นทุนนำเข้า:</strong> ฿${parseFloat(order.totalImportCost || 0).toFixed(2)}
                        </div>
                        <div>
                            <strong>กำไร:</strong> <span style="color: ${order.profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">฿${parseFloat(order.profit || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="showOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i> ดูรายละเอียด
                        </button>
                        ${isAdmin && order.status !== 'cancelled' && order.status !== 'completed' ? `
                            <button class="btn btn-primary btn-sm" onclick="showUpdateOrderStatusModal('${order.id}')">
                                <i class="fas fa-edit"></i> อัปเดตสถานะ
                            </button>
                        ` : ''}
                        ${isAdmin && !order.invoiceId && order.status !== 'cancelled' ? `
                            <button class="btn btn-success btn-sm" onclick="showCreateInvoiceModal('${order.id}')">
                                <i class="fas fa-file-invoice"></i> สร้างใบแจ้งหนี้
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function showOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            showNotification('ไม่พบคำสั่งซื้อ', 'error');
            return;
        }
        
        const order = await response.json();
        const orderDate = new Date(order.createdAt);
        
        const content = document.getElementById('orderDetailsContent');
        content.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <h3>${order.orderNumber}</h3>
                <p><strong>ลูกค้า:</strong> ${order.username}</p>
                <p><strong>วันที่สั่งซื้อ:</strong> ${orderDate.toLocaleString('th-TH')}</p>
                <p><strong>สถานะ:</strong> ${order.status}</p>
                <p><strong>สถานะการชำระเงิน:</strong> ${order.paymentStatus}</p>
                <p><strong>สถานะการส่งมอบ:</strong> ${order.deliveryStatus}</p>
            </div>
            <div style="margin-bottom: 1rem;">
                <h4>รายการสินค้า:</h4>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>สินค้า</th>
                            <th>จำนวน</th>
                            <th>ราคา</th>
                            <th>ยอดรวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.quantity}</td>
                                <td>฿${parseFloat(item.price).toFixed(2)}</td>
                                <td>฿${parseFloat(item.totalPrice).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="border-top: 2px solid var(--border-color); padding-top: 1rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>ยอดรวม:</span>
                    <strong>฿${parseFloat(order.totalPrice).toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>ต้นทุนการขาย:</span>
                    <span>฿${parseFloat(order.totalCost || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>ต้นทุนการนำเข้า:</span>
                    <span>฿${parseFloat(order.totalImportCost || 0).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 600; color: ${order.profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                    <span>กำไร:</span>
                    <span>฿${parseFloat(order.profit || 0).toFixed(2)}</span>
                </div>
            </div>
        `;
        
        document.getElementById('orderDetailsModal').classList.add('show');
    } catch (error) {
        console.error('Error loading order details:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

function showUpdateOrderStatusModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const newStatus = prompt(`อัปเดตสถานะคำสั่งซื้อ ${order.orderNumber}\n\nสถานะปัจจุบัน: ${order.status}\n\nกรุณาเลือกสถานะใหม่:\n1. pending\n2. unpaid\n3. awaiting_delivery\n4. completed\n5. cancelled`, order.status);
    
    if (!newStatus || newStatus === order.status) return;
    
    updateOrderStatus(orderId, newStatus);
}

async function updateOrderStatus(orderId, status) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadOrders();
            showNotification('อัปเดตสถานะสำเร็จ', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'อัปเดตสถานะไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// ========== INVOICE MANAGEMENT ==========

let invoices = [];

async function loadInvoices() {
    if (!currentUser) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/invoices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            invoices = await response.json();
            renderInvoices();
        } else {
            console.error('Failed to load invoices');
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function renderInvoices() {
    const list = document.getElementById('invoicesList');
    if (!list) return;
    
    if (invoices.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice"></i><h3>ยังไม่มีใบแจ้งหนี้</h3></div>';
        return;
    }
    
    list.innerHTML = invoices.map(invoice => {
        const issueDate = new Date(invoice.issueDate);
        const statusLabels = {
            draft: 'ร่าง',
            issued: 'ออกแล้ว',
            paid: 'ชำระแล้ว',
            cancelled: 'ยกเลิก'
        };
        const statusColors = {
            draft: 'badge-warning',
            issued: 'badge-info',
            paid: 'badge-success',
            cancelled: 'badge-danger'
        };
        
        return `
            <div class="history-card">
                <div class="history-header">
                    <div>
                        <h4>${invoice.invoiceNumber}</h4>
                        <span class="badge ${statusColors[invoice.status] || 'badge-warning'}">${statusLabels[invoice.status] || invoice.status}</span>
                        <span class="badge badge-primary">คำสั่งซื้อ: ${invoice.orderNumber}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-user"></i> ${invoice.username || 'ไม่ระบุ'}
                        </div>
                        <div style="color: var(--text-light); font-size: 0.875rem;">
                            <i class="fas fa-clock"></i> ${issueDate.toLocaleString('th-TH')}
                        </div>
                    </div>
                </div>
                <div class="history-items">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                        <div>
                            <strong>ยอดรวม:</strong> ฿${parseFloat(invoice.totalAmount).toFixed(2)}
                        </div>
                        <div>
                            <strong>ชำระแล้ว:</strong> ฿${parseFloat(invoice.paidAmount || 0).toFixed(2)}
                        </div>
                        <div>
                            <strong>คงเหลือ:</strong> <span style="color: ${invoice.remainingAmount > 0 ? 'var(--danger-color)' : 'var(--success-color)'}">฿${parseFloat(invoice.remainingAmount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${invoice.status === 'issued' && invoice.remainingAmount > 0 ? `
                            <button class="btn btn-success btn-sm" onclick="showPaymentModal('${invoice.id}')">
                                <i class="fas fa-money-bill-wave"></i> บันทึกการชำระเงิน
                            </button>
                        ` : ''}
                        ${isAdmin && !invoice.debitNoteId && invoice.status !== 'cancelled' ? `
                            <button class="btn btn-warning btn-sm" onclick="showCreateDebitNoteModal('${invoice.id}')">
                                <i class="fas fa-file-invoice-dollar"></i> สร้างใบลดหนี้
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showCreateInvoiceModal(orderId) {
    if (!isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    
    document.getElementById('invoiceOrderId').value = orderId;
    document.getElementById('invoiceTax').value = 0;
    document.getElementById('invoiceDiscount').value = 0;
    document.getElementById('invoiceNotes').value = '';
    document.getElementById('createInvoiceModal').classList.add('show');
}

async function handleCreateInvoice(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('invoiceOrderId').value;
    const tax = document.getElementById('invoiceTax').value;
    const discount = document.getElementById('invoiceDiscount').value;
    const dueDate = document.getElementById('invoiceDueDate').value;
    const notes = document.getElementById('invoiceNotes').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId, tax, discount, dueDate, notes })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createInvoiceModal');
            loadInvoices();
            loadOrders();
            showNotification('สร้างใบแจ้งหนี้สำเร็จ', 'success');
        } else {
            showNotification(data.error || 'สร้างใบแจ้งหนี้ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function showPaymentModal(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    document.getElementById('paymentInvoiceId').value = invoiceId;
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentRemaining').textContent = `ยอดคงเหลือ: ฿${parseFloat(invoice.remainingAmount).toFixed(2)}`;
    document.getElementById('paymentModal').classList.add('show');
}

async function handlePayment(e) {
    e.preventDefault();
    
    const invoiceId = document.getElementById('paymentInvoiceId').value;
    const paidAmount = document.getElementById('paymentAmount').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/invoices/${invoiceId}/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ paidAmount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('paymentModal');
            loadInvoices();
            loadOrders();
            showNotification('บันทึกการชำระเงินสำเร็จ', 'success');
        } else {
            showNotification(data.error || 'บันทึกการชำระเงินไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function showCreateDebitNoteModal(invoiceId) {
    if (!isAdmin) {
        showNotification('ต้องเป็น Admin เท่านั้น', 'error');
        return;
    }
    
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    document.getElementById('debitNoteInvoiceId').value = invoiceId;
    document.getElementById('debitNoteReason').value = '';
    document.getElementById('debitNoteNotes').value = '';
    
    const itemsList = document.getElementById('debitNoteItemsList');
    itemsList.innerHTML = invoice.items.map((item, index) => `
        <div style="padding: 0.5rem; margin-bottom: 0.5rem; background: var(--bg-color); border-radius: 4px;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" name="debitNoteItem" value="${index}" data-item='${JSON.stringify(item)}'>
                <span>${item.productName} x ${item.quantity} = ฿${parseFloat(item.totalPrice).toFixed(2)}</span>
            </label>
        </div>
    `).join('');
    
    document.getElementById('createDebitNoteModal').classList.add('show');
}

async function handleCreateDebitNote(e) {
    e.preventDefault();
    
    const invoiceId = document.getElementById('debitNoteInvoiceId').value;
    const reason = document.getElementById('debitNoteReason').value;
    const notes = document.getElementById('debitNoteNotes').value;
    
    const checkedItems = Array.from(document.querySelectorAll('input[name="debitNoteItem"]:checked'));
    const items = checkedItems.map(checkbox => JSON.parse(checkbox.dataset.item));
    
    if (items.length === 0) {
        showNotification('กรุณาเลือกรายการสินค้าที่ต้องการลดหนี้', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/debit-notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ invoiceId, reason, items, notes })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('createDebitNoteModal');
            loadInvoices();
            showNotification('สร้างใบลดหนี้สำเร็จ', 'success');
        } else {
            showNotification(data.error || 'สร้างใบลดหนี้ไม่สำเร็จ', 'error');
        }
    } catch (error) {
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// ========== PROFIT REPORT ==========

async function loadProfitReport(reset = false) {
    if (!isAdmin) return;
    
    try {
        const token = localStorage.getItem('token');
        let url = `${API_URL}/admin/reports/profit`;
        
        if (!reset) {
            const startDate = document.getElementById('profitStartDate')?.value;
            const endDate = document.getElementById('profitEndDate')?.value;
            const params = [];
            if (startDate) params.push(`startDate=${startDate}`);
            if (endDate) params.push(`endDate=${endDate}`);
            if (params.length > 0) url += '?' + params.join('&');
        } else {
            document.getElementById('profitStartDate').value = '';
            document.getElementById('profitEndDate').value = '';
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const report = await response.json();
            renderProfitReport(report);
        } else {
            console.error('Failed to load profit report');
        }
    } catch (error) {
        console.error('Error loading profit report:', error);
    }
}

function renderProfitReport(report) {
    const container = document.getElementById('profitReport');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--primary-color);">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${report.totalOrders || 0}</div>
                    <div class="stat-label">คำสั่งซื้อที่เสร็จสมบูรณ์</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--success-color);">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">฿${parseFloat(report.totalRevenue || 0).toFixed(2)}</div>
                    <div class="stat-label">รายได้รวม</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--warning-color);">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">฿${parseFloat(report.totalCost || 0).toFixed(2)}</div>
                    <div class="stat-label">ต้นทุนการขายรวม</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--secondary-color);">
                    <i class="fas fa-shipping-fast"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">฿${parseFloat(report.totalImportCost || 0).toFixed(2)}</div>
                    <div class="stat-label">ต้นทุนการนำเข้าสรุป</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: ${report.totalProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value" style="color: ${report.totalProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">฿${parseFloat(report.totalProfit || 0).toFixed(2)}</div>
                    <div class="stat-label">กำไรสุทธิ</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--primary-color);">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${parseFloat(report.profitMargin || 0).toFixed(2)}%</div>
                    <div class="stat-label">อัตรากำไร (Profit Margin)</div>
                </div>
            </div>
        </div>
        <div style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow);">
            <h3 style="margin-bottom: 1rem;">สรุปรายงาน</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div>
                    <strong>รายได้รวม:</strong>
                    <div style="font-size: 1.5rem; color: var(--success-color);">฿${parseFloat(report.totalRevenue || 0).toFixed(2)}</div>
                </div>
                <div>
                    <strong>ต้นทุนรวม:</strong>
                    <div style="font-size: 1.5rem; color: var(--warning-color);">฿${(parseFloat(report.totalCost || 0) + parseFloat(report.totalImportCost || 0)).toFixed(2)}</div>
                </div>
                <div>
                    <strong>กำไรสุทธิ:</strong>
                    <div style="font-size: 1.5rem; color: ${report.totalProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">฿${parseFloat(report.totalProfit || 0).toFixed(2)}</div>
                </div>
                <div>
                    <strong>อัตรากำไร:</strong>
                    <div style="font-size: 1.5rem; color: var(--primary-color);">${parseFloat(report.profitMargin || 0).toFixed(2)}%</div>
                </div>
            </div>
        </div>
    `;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

