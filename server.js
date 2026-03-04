const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'maket-secret-key-change-in-production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/maket?authSource=admin';

// MongoDB Models
const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  // roles:
  // - admin (Admin หลัก / super admin เดิม)
  // - user (ผู้ใช้ทั่วไปเดิม)
  // - company_user (ผู้ใช้ของแต่ละบริษัท)
  role: { type: String, default: 'user' },
  companyId: { type: String, default: null },
  companyName: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true }, // ราคาขาย
  cost: { type: Number, default: 0 }, // ต้นทุนการขาย
  importCost: { type: Number, default: 0 }, // ต้นทุนการนำเข้า
  categoryId: String,
  stock: { type: Number, required: true },
  image: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
  companyId: { type: String, default: null }, // ID สาขาเจ้าของสินค้า
  companyName: { type: String, default: null } // ชื่อสาขาเจ้าของสินค้า
});

const CategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// Historical Tracking Schemas
const SalesHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  totalPrice: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  saleDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const ProductAdditionHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productDescription: String,
  price: { type: Number, required: true },
  categoryId: String,
  stock: { type: Number, required: true },
  image: String,
  addedBy: { type: String, required: true },
  addedByUsername: { type: String, required: true },
  additionDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const ProductDeletionHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productDescription: String,
  price: { type: Number, required: true },
  categoryId: String,
  stock: { type: Number, required: true },
  image: String,
  deletedBy: { type: String, required: true },
  deletedByUsername: { type: String, required: true },
  deletionDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Order Schema สำหรับจัดการคำสั่งซื้อ
const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // ราคาขาย
    cost: { type: Number, default: 0 }, // ต้นทุนการขาย
    importCost: { type: Number, default: 0 }, // ต้นทุนการนำเข้า
    totalPrice: { type: Number, required: true },
    totalCost: { type: Number, default: 0 }, // ต้นทุนรวม
    totalImportCost: { type: Number, default: 0 } // ต้นทุนการนำเข้าสำหรับรายการนี้
  }],
  totalPrice: { type: Number, required: true },
  totalCost: { type: Number, default: 0 }, // ต้นทุนรวมทั้งหมด
  totalImportCost: { type: Number, default: 0 }, // ต้นทุนการนำเข้าทั้งหมด
  profit: { type: Number, default: 0 }, // กำไร
  status: { 
    type: String, 
    enum: ['pending', 'unpaid', 'awaiting_delivery', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  deliveryStatus: { type: String, enum: ['pending', 'preparing', 'shipped', 'delivered'], default: 'pending' },
  invoiceId: String, // ลิงก์ไปยังใบแจ้งหนี้
  debitNoteId: String, // ลิงก์ไปยังใบลดหนี้ (ถ้ามี)
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: String,
  cancelledReason: String
});

// Invoice Schema สำหรับใบแจ้งหนี้
const InvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  orderNumber: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'issued', 'paid', 'cancelled'], default: 'draft' },
  issueDate: { type: Date, default: Date.now },
  dueDate: Date,
  paidDate: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// DebitNote Schema สำหรับใบลดหนี้
const DebitNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  debitNoteNumber: { type: String, required: true, unique: true },
  invoiceId: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  orderId: { type: String, required: true },
  orderNumber: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  reason: { type: String, required: true }, // เหตุผลในการออกใบลดหนี้
  items: [{
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'issued', 'cancelled'], default: 'draft' },
  issueDate: { type: Date, default: Date.now },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Withdrawal (เบิกสินค้า) Schema
const WithdrawalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  companyName: { type: String, required: true },
  productCode: { type: String, required: true }, // รหัสสินค้า
  productId: { type: String, default: null },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  withdrawPrice: { type: Number, required: true }, // เบิกไปในราคาเท่าไหร่ (ต่อหน่วยหรือรวม? -> ต่อหน่วย)
  totalAmount: { type: Number, required: true },
  withdrawnAt: { type: Date, default: Date.now },
  withdrawnBy: { type: String, required: true },
  withdrawnByUsername: { type: String, required: true },
  companyId: { type: String, default: null },
  // สถานะการจัดส่งภายในสาขา:
  // - pending_approval: รออนุมัติจากสาขาเจ้าของสินค้า (เมื่อขอเบิกจากสาขาอื่น)
  // - approved: อนุมัติแล้ว (พร้อมจัดส่ง)
  // - rejected: ปฏิเสธคำขอเบิก
  // - pending: สร้างคำขอเบิกแล้ว (รอจัดการ) - สำหรับเบิกสินค้าของตัวเอง
  // - shipping: สินค้ากำลังจัดส่ง
  // - delivered: สินค้าถึงที่หมายแล้ว (รอผู้รับยืนยัน)
  // - received: ผู้รับยืนยันว่าได้รับสินค้าแล้ว
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'rejected', 'pending', 'shipping', 'delivered', 'received'], 
    default: 'pending' 
  },
  // รหัสพัสดุ / Tracking ภายในระบบ
  trackingCode: { type: String, default: null },
  fromLocation: { type: String, default: null }, // เบิกจากที่ไหน (ต้นทาง)
  toLocation: { type: String, default: null }, // ไปที่ไหน (ปลายทาง)
  // ข้อมูลสาขาที่ขอเบิกสินค้า (เมื่อเบิกจากสาขาอื่น)
  requestedFromCompanyId: { type: String, default: null }, // ID สาขาเจ้าของสินค้า
  requestedFromCompanyName: { type: String, default: null }, // ชื่อสาขาเจ้าของสินค้า
  requestedFromUserId: { type: String, default: null }, // ID ผู้ใช้เจ้าของสินค้า (createdBy)
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Product = mongoose.model('Product', ProductSchema);
const Category = mongoose.model('Category', CategorySchema);
const SalesHistory = mongoose.model('SalesHistory', SalesHistorySchema);
const ProductAdditionHistory = mongoose.model('ProductAdditionHistory', ProductAdditionHistorySchema);
const ProductDeletionHistory = mongoose.model('ProductDeletionHistory', ProductDeletionHistorySchema);
const Order = mongoose.model('Order', OrderSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const DebitNote = mongoose.model('DebitNote', DebitNoteSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);

// Connect to MongoDB (optional - falls back to JSON if not available)
let useMongoDB = false;
if (process.env.USE_MONGODB === 'true') {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ Connected to MongoDB');
    useMongoDB = true;
  }).catch((err) => {
    console.log('⚠️  MongoDB not available, using JSON files:', err.message);
    useMongoDB = false;
  });
}

// Middleware
app.use(cors());

// ต้องใส่ body parser ก่อน static files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware สำหรับ debug (ต้องอยู่ก่อน routes)
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
  }
  next();
});

app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static('uploads'));

// สร้างโฟลเดอร์สำหรับเก็บข้อมูล
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ไฟล์ข้อมูล
const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');
const categoriesFile = path.join(dataDir, 'categories.json');
const qrCodeFile = path.join(dataDir, 'qrcode.json');
const reportsFile = path.join(dataDir, 'reports.json');
const salesHistoryFile = path.join(dataDir, 'salesHistory.json');
const productAdditionHistoryFile = path.join(dataDir, 'productAdditionHistory.json');
const productDeletionHistoryFile = path.join(dataDir, 'productDeletionHistory.json');
const ordersFile = path.join(dataDir, 'orders.json');
const invoicesFile = path.join(dataDir, 'invoices.json');
const debitNotesFile = path.join(dataDir, 'debitNotes.json');
const withdrawalsFile = path.join(dataDir, 'withdrawals.json');

// ฟังก์ชันอ่าน/เขียนไฟล์ JSON
function readJSON(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    return [];
  } catch (error) {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ตั้งค่า multer สำหรับอัปโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const qrCodeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'qrcode-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // เพิ่มเป็น 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png, gif, webp, bmp, svg)'));
    }
  }
});

const uploadQRCode = multer({ 
  storage: qrCodeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // เพิ่มเป็น 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png, gif, webp, bmp, svg)'));
    }
  }
});

// Middleware สำหรับตรวจสอบ JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'ไม่พบ token' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token ไม่ถูกต้อง' });
    }
    
    // ดึงข้อมูล user จาก database
    const users = readJSON(usersFile);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(403).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    };
    next();
  });
}

// Middleware สำหรับตรวจสอบว่าเป็น Admin
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'ต้องเป็น Admin เท่านั้น' });
  }
  next();
}

// Middleware สำหรับตรวจสอบว่าเป็น Admin หลัก หรือ Company User
function isAdminOrCompany(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'company_user') {
    return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
}

// ========== AUTHENTICATION ROUTES ==========

// ลงทะเบียน
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    
    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    // ตรวจสอบรูปแบบเบอร์มือถือ
    if (!/^[0-9]{9,10}$/.test(phone)) {
      return res.status(400).json({ error: 'เบอร์มือถือไม่ถูกต้อง กรุณากรอก 9-10 หลัก' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      username,
      email,
      phone,
      password: hashedPassword,
      role: 'user', // เริ่มต้นเป็น user
      createdAt: new Date().toISOString()
    };

    if (useMongoDB) {
      // บันทึกไปยัง MongoDB
      try {
        const mongoUser = new User({
          id: userId,
          username,
          email,
          phone,
          password: hashedPassword,
          role: 'user',
          createdAt: new Date()
        });
        await mongoUser.save();
        console.log('✅ User saved to MongoDB');
      } catch (mongoError) {
        if (mongoError.code === 11000) {
          return res.status(400).json({ error: 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
        }
        console.error('MongoDB save error:', mongoError);
      }
    }

    // บันทึกไปยัง JSON file (fallback หรือ dual write)
    const users = readJSON(usersFile);
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }

    users.push(newUser);
    writeJSON(usersFile, users);

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET);
    res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, companyId: newUser.companyId || null, companyName: newUser.companyName || null } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
  }
});

// เข้าสู่ระบบ
app.post('/api/login', async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    
    // ตรวจสอบว่า body เป็น object หรือไม่
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' });
    }
    
    const { email, password } = req.body;
    
    console.log('Extracted email:', email);
    console.log('Extracted password:', password ? '***' : 'missing');
    
    if (!email || (typeof email === 'string' && email.trim() === '')) {
      console.log('Missing or empty email');
      return res.status(400).json({ error: 'กรุณากรอกอีเมล' });
    }
    
    if (!password || (typeof password === 'string' && password.trim() === '')) {
      console.log('Missing or empty password');
      return res.status(400).json({ error: 'กรุณากรอกรหัสผ่าน' });
    }

    const users = readJSON(usersFile);
    console.log('Total users in database:', users.length);
    console.log('Looking for email:', email.trim ? email.trim() : email);
    
    const user = users.find(u => {
      if (!u.email) return false;
      const uEmail = u.email.trim().toLowerCase();
      const searchEmail = (email.trim ? email.trim() : email).toLowerCase();
      return uEmail === searchEmail;
    });

    if (!user) {
      console.log('User not found. Available emails:', users.map(u => u.email));
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    console.log('User found:', user.email, 'Role:', user.role);
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    console.log('✅ Login successful for user:', user.email);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role || 'user', companyId: user.companyId || null }, JWT_SECRET);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role || 'user',
        companyId: user.companyId || null,
        companyName: user.companyName || null
      } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', details: error.message });
  }
});

// ========== CATEGORY ROUTES ==========

// ดึงหมวดหมู่ทั้งหมด
app.get('/api/categories', (req, res) => {
  const categories = readJSON(categoriesFile);
  res.json(categories);
});

// เพิ่มหมวดหมู่
app.post('/api/categories', authenticateToken, isAdminOrCompany, (req, res) => {
  try {
    console.log('Add category - User:', req.user);
    console.log('Add category - Body:', req.body);
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อหมวดหมู่' });
    }

    const categories = readJSON(categoriesFile);
    const newCategory = {
      id: Date.now().toString(),
      name,
      description: description || '',
      createdAt: new Date().toISOString()
    };

    categories.push(newCategory);
    writeJSON(categoriesFile, categories);
    res.json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่' });
  }
});

// ลบหมวดหมู่
app.delete('/api/categories/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const categories = readJSON(categoriesFile);
    const filtered = categories.filter(c => c.id !== req.params.id);
    writeJSON(categoriesFile, filtered);
    res.json({ message: 'ลบหมวดหมู่สำเร็จ' });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบหมวดหมู่' });
  }
});

// ========== PRODUCT ROUTES ==========

// ดึงสินค้าทั้งหมด
app.get('/api/products', (req, res) => {
  const products = readJSON(productsFile);
  res.json(products);
});

// ดึงสินค้าตาม ID
app.get('/api/products/:id', (req, res) => {
  const products = readJSON(productsFile);
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'ไม่พบสินค้า' });
  }
  res.json(product);
});

// เพิ่มสินค้า
app.post('/api/products', authenticateToken, isAdminOrCompany, upload.single('image'), async (req, res) => {
  try {
    console.log('Add product - User:', req.user);
    console.log('Add product - Body:', req.body);
    console.log('Add product - File:', req.file);
    
    const { name, description, price, cost, importCost, categoryId, stock, companyId, companyName } = req.body;
    
    if (!name || !price || !stock || !companyId || !companyName) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (รวมถึงสาขา)' });
    }

    const products = readJSON(productsFile);
    const productId = Date.now().toString();
    const newProduct = {
      id: productId,
      name,
      description: description || '',
      price: parseFloat(price),
      cost: parseFloat(cost || 0),
      importCost: parseFloat(importCost || 0),
      categoryId: categoryId || null,
      stock: parseInt(stock),
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      companyId: companyId || req.user.companyId || null,
      companyName: companyName || req.user.companyName || null
    };

    products.push(newProduct);
    writeJSON(productsFile, products);

    // บันทึกประวัติการเพิ่มสินค้า
    const additionHistoryId = Date.now().toString() + '-add';
    const additionHistory = {
      id: additionHistoryId,
      productId: productId,
      productName: name,
      productDescription: description || '',
      price: parseFloat(price),
      categoryId: categoryId || null,
      stock: parseInt(stock),
      image: req.file ? `/uploads/${req.file.filename}` : null,
      addedBy: req.user.id,
      addedByUsername: req.user.username,
      additionDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // บันทึกไปยัง JSON file
    const productAdditionHistory = readJSON(productAdditionHistoryFile);
    productAdditionHistory.push(additionHistory);
    writeJSON(productAdditionHistoryFile, productAdditionHistory);

    // บันทึกไปยัง MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        const mongoAdditionHistory = new ProductAdditionHistory({
          id: additionHistoryId,
          productId: productId,
          productName: name,
          productDescription: description || '',
          price: parseFloat(price),
          categoryId: categoryId || null,
          stock: parseInt(stock),
          image: req.file ? `/uploads/${req.file.filename}` : null,
          addedBy: req.user.id,
          addedByUsername: req.user.username,
          additionDate: new Date(),
          createdAt: new Date()
        });
        await mongoAdditionHistory.save();
        console.log('✅ Product addition history saved to MongoDB');
      } catch (mongoError) {
        console.error('MongoDB product addition history save error:', mongoError);
      }
    }

    res.json(newProduct);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า' });
  }
});

// อัปเดตสินค้า
app.put('/api/products/:id', authenticateToken, isAdminOrCompany, upload.single('image'), (req, res) => {
  try {
    console.log('Update product - User:', req.user);
    console.log('Update product - Body:', req.body);
    console.log('Update product - File:', req.file);
    
    const products = readJSON(productsFile);
    const productIndex = products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบสินค้า' });
    }

    const product = products[productIndex];
    
    // ถ้าเป็น company_user ต้องเป็นเจ้าของสินค้านั้นเท่านั้น
    if (req.user.role === 'company_user' && product.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขสินค้านี้' });
    }

    const { name, description, price, cost, importCost, categoryId, stock } = req.body;

    product.name = name || product.name;
    product.description = description !== undefined ? description : product.description;
    product.price = price ? parseFloat(price) : product.price;
    product.cost = cost !== undefined ? parseFloat(cost) : (product.cost || 0);
    product.importCost = importCost !== undefined ? parseFloat(importCost) : (product.importCost || 0);
    product.categoryId = categoryId !== undefined ? categoryId : product.categoryId;
    product.stock = stock ? parseInt(stock) : product.stock;
    
    if (req.file) {
      // ลบรูปเก่าถ้ามี
      if (product.image && fs.existsSync(path.join(__dirname, product.image))) {
        fs.unlinkSync(path.join(__dirname, product.image));
      }
      product.image = `/uploads/${req.file.filename}`;
    }

    product.updatedAt = new Date().toISOString();
    writeJSON(productsFile, products);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสินค้า' });
  }
});

// ลบสินค้า
app.delete('/api/products/:id', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    const products = readJSON(productsFile);
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'ไม่พบสินค้า' });
    }
    
    // ถ้าเป็น company_user ต้องเป็นเจ้าของสินค้านั้นเท่านั้น
    if (req.user.role === 'company_user' && product.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบสินค้านี้' });
    }

    // บันทึกประวัติการลบสินค้าก่อนลบ
    const deletionHistoryId = Date.now().toString() + '-del';
    const deletionHistory = {
      id: deletionHistoryId,
      productId: product.id,
      productName: product.name,
      productDescription: product.description || '',
      price: product.price,
      categoryId: product.categoryId || null,
      stock: product.stock,
      image: product.image || null,
      deletedBy: req.user.id,
      deletedByUsername: req.user.username,
      deletionDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // บันทึกไปยัง JSON file
    const productDeletionHistory = readJSON(productDeletionHistoryFile);
    productDeletionHistory.push(deletionHistory);
    writeJSON(productDeletionHistoryFile, productDeletionHistory);

    // บันทึกไปยัง MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        const mongoDeletionHistory = new ProductDeletionHistory({
          id: deletionHistoryId,
          productId: product.id,
          productName: product.name,
          productDescription: product.description || '',
          price: product.price,
          categoryId: product.categoryId || null,
          stock: product.stock,
          image: product.image || null,
          deletedBy: req.user.id,
          deletedByUsername: req.user.username,
          deletionDate: new Date(),
          createdAt: new Date()
        });
        await mongoDeletionHistory.save();
        console.log('✅ Product deletion history saved to MongoDB');
      } catch (mongoError) {
        console.error('MongoDB product deletion history save error:', mongoError);
      }
    }

    // ลบรูปภาพ
    if (product.image && fs.existsSync(path.join(__dirname, product.image))) {
      fs.unlinkSync(path.join(__dirname, product.image));
    }

    const filtered = products.filter(p => p.id !== req.params.id);
    writeJSON(productsFile, filtered);
    res.json({ message: 'ลบสินค้าสำเร็จ' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
  }
});

// ========== QR CODE ROUTES ==========

// ดึง QR Code
app.get('/api/qrcode', (req, res) => {
  try {
    let qrCodeData = null;
    if (fs.existsSync(qrCodeFile)) {
      try {
        qrCodeData = JSON.parse(fs.readFileSync(qrCodeFile, 'utf8'));
      } catch (error) {
        // ถ้าไฟล์เสียหาย ให้ return null
        qrCodeData = null;
      }
    }
    
    if (qrCodeData && qrCodeData.image) {
      res.json(qrCodeData);
    } else {
      res.json({ image: null, message: null });
    }
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึง QR Code' });
  }
});

// อัปโหลด/อัปเดต QR Code
app.post('/api/qrcode', authenticateToken, isAdmin, (req, res, next) => {
  // ใช้ multer middleware
  uploadQRCode.single('qrcode')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' });
        }
        return res.status(400).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    console.log('QR Code upload - User:', req.user);
    console.log('QR Code upload - File:', req.file);
    console.log('QR Code upload - Body:', req.body);
    console.log('QR Code upload - Files:', req.files);
    
    const { message } = req.body;
    
    let qrCodeData = null;
    if (fs.existsSync(qrCodeFile)) {
      try {
        qrCodeData = JSON.parse(fs.readFileSync(qrCodeFile, 'utf8'));
      } catch (error) {
        console.error('Error reading QR code file:', error);
        qrCodeData = null;
      }
    }
    
    // ลบ QR Code เก่าถ้ามี
    if (qrCodeData && qrCodeData.image) {
      const oldImagePath = path.join(__dirname, qrCodeData.image);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log('Deleted old QR code image:', oldImagePath);
        } catch (error) {
          console.error('Error deleting old QR code image:', error);
        }
      }
    }
    
    // ถ้ามีไฟล์ใหม่ ให้ใช้ไฟล์ใหม่ ถ้าไม่มีให้ใช้ไฟล์เก่า
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (qrCodeData?.image || null);
    
    if (!imagePath && !message) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพหรือกรอกข้อความ' });
    }
    
    qrCodeData = {
      image: imagePath,
      message: message !== undefined && message.trim() !== '' ? message : (qrCodeData?.message || 'กรุณาสแกน QR Code เพื่อชำระเงิน'),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };
    
    writeJSON(qrCodeFile, qrCodeData);
    console.log('QR Code saved successfully:', qrCodeData);
    res.status(200).json(qrCodeData);
  } catch (error) {
    console.error('QR Code upload error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลด QR Code: ' + error.message });
  }
});

// ========== ORDER/CHECKOUT ROUTES ==========

// สั่งซื้อสินค้า (สร้าง Order)
app.post('/api/checkout', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }, ...]
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'ไม่มีสินค้าในตะกร้า' });
    }

    const products = readJSON(productsFile);
    const errors = [];
    const updatedProducts = [];
    const orderItems = [];
    let totalPrice = 0;
    let totalCost = 0;
    let totalImportCost = 0;
    let totalItems = 0;

    // ตรวจสอบและลด stock
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        errors.push(`ไม่พบสินค้า: ${item.productId}`);
        continue;
      }

      if (product.stock < item.quantity) {
        errors.push(`สินค้า "${product.name}" สต็อกไม่เพียงพอ (เหลือ ${product.stock} ชิ้น)`);
        continue;
      }

      // คำนวณต้นทุน
      const productCost = parseFloat(product.cost || 0);
      const productImportCost = parseFloat(product.importCost || 0);
      const itemTotalPrice = product.price * item.quantity;
      const itemTotalCost = productCost * item.quantity;
      const itemTotalImportCost = productImportCost * item.quantity;

      // ลด stock
      product.stock -= item.quantity;
      product.updatedAt = new Date().toISOString();
      updatedProducts.push({
        id: product.id,
        name: product.name,
        quantity: item.quantity,
        remainingStock: product.stock
      });

      // เตรียมข้อมูลสำหรับ Order
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        cost: productCost,
        importCost: productImportCost,
        totalPrice: itemTotalPrice,
        totalCost: itemTotalCost,
        totalImportCost: itemTotalImportCost
      });
      
      totalPrice += itemTotalPrice;
      totalCost += itemTotalCost;
      totalImportCost += itemTotalImportCost;
      totalItems += item.quantity;
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'ไม่สามารถสั่งซื้อได้', details: errors });
    }

    // คำนวณกำไร
    const profit = totalPrice - totalCost - totalImportCost;

    // บันทึกการเปลี่ยนแปลง
    writeJSON(productsFile, products);

    // สร้าง Order
    const orderId = Date.now().toString();
    const orderNumber = 'ORD-' + Date.now();
    const order = {
      id: orderId,
      orderNumber: orderNumber,
      userId: req.user.id,
      username: req.user.username,
      items: orderItems,
      totalPrice: totalPrice,
      totalCost: totalCost,
      totalImportCost: totalImportCost,
      profit: profit,
      status: 'pending',
      // ผู้ใช้ยืนยันการชำระเงินแล้วจากหน้าตะกร้า -> ถือว่า "ชำระแล้ว"
      paymentStatus: 'paid',
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // บันทึกไปยัง JSON file
    const orders = readJSON(ordersFile);
    orders.push(order);
    writeJSON(ordersFile, orders);

    // บันทึกไปยัง MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        const mongoOrder = new Order({
          id: orderId,
          orderNumber: orderNumber,
          userId: req.user.id,
          username: req.user.username,
          items: orderItems,
          totalPrice: totalPrice,
          totalCost: totalCost,
          totalImportCost: totalImportCost,
          profit: profit,
          status: 'pending',
          paymentStatus: 'paid',
          deliveryStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await mongoOrder.save();
        console.log('✅ Order saved to MongoDB');
      } catch (mongoError) {
        console.error('MongoDB order save error:', mongoError);
      }
    }

    // บันทึกประวัติการขาย (เพื่อความเข้ากันได้กับระบบเดิม)
    const saleHistoryId = Date.now().toString() + '-sale';
    const saleHistory = {
      id: saleHistoryId,
      orderId: orderId,
      userId: req.user.id,
      username: req.user.username,
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      totalPrice: totalPrice,
      totalItems: totalItems,
      saleDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const salesHistory = readJSON(salesHistoryFile);
    salesHistory.push(saleHistory);
    writeJSON(salesHistoryFile, salesHistory);

    if (useMongoDB) {
      try {
        const mongoSaleHistory = new SalesHistory({
          id: saleHistoryId,
          orderId: orderId,
          userId: req.user.id,
          username: req.user.username,
          items: saleHistory.items,
          totalPrice: totalPrice,
          totalItems: totalItems,
          saleDate: new Date(),
          createdAt: new Date()
        });
        await mongoSaleHistory.save();
      } catch (mongoError) {
        console.error('MongoDB sales history save error:', mongoError);
      }
    }

    res.json({
      message: 'สั่งซื้อสำเร็จ',
      updatedProducts,
      orderId: orderId,
      orderNumber: orderNumber,
      order: order
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสั่งซื้อ' });
  }
});

// ========== REPORTS ROUTES ==========

// ส่งรายงานปัญหา
app.post('/api/reports', authenticateToken, (req, res) => {
  try {
    const { title, description, type } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'กรุณากรอกหัวข้อและรายละเอียด' });
    }

    const reports = readJSON(reportsFile);
    const newReport = {
      id: Date.now().toString(),
      title,
      description,
      type: type || 'general',
      status: 'pending',
      userId: req.user.id,
      username: req.user.username,
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    writeJSON(reportsFile, reports);
    res.json(newReport);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งรายงาน' });
  }
});

// ดึงรายงานทั้งหมด (Admin only)
app.get('/api/reports', authenticateToken, isAdmin, (req, res) => {
  try {
    const reports = readJSON(reportsFile);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายงาน' });
  }
});

// อัปเดตสถานะรายงาน (Admin only)
app.put('/api/reports/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const reports = readJSON(reportsFile);
    const report = reports.find(r => r.id === req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'ไม่พบรายงาน' });
    }

    report.status = status || report.status;
    report.updatedAt = new Date().toISOString();
    report.updatedBy = req.user.id;
    
    writeJSON(reportsFile, reports);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตรายงาน' });
  }
});

// ========== ADMIN PANEL ROUTES ==========

// สถิติสำหรับ Admin Panel
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
  try {
    const users = readJSON(usersFile);
    const products = readJSON(productsFile);
    const categories = readJSON(categoriesFile);
    const reports = readJSON(reportsFile);
    
    const stats = {
      totalUsers: users.length,
      totalProducts: products.length,
      totalCategories: categories.length,
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      lowStockProducts: products.filter(p => p.stock < 10).length,
      outOfStockProducts: products.filter(p => p.stock === 0).length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงสถิติ' });
  }
});

// ดึงข้อมูลทั้งหมดสำหรับ Admin Panel
app.get('/api/admin/data', authenticateToken, isAdmin, (req, res) => {
  try {
    const users = readJSON(usersFile);
    const products = readJSON(productsFile);
    const categories = readJSON(categoriesFile);
    const reports = readJSON(reportsFile);
    
    // ไม่ส่ง password
    const usersWithoutPassword = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role || 'user',
      companyId: u.companyId || null,
      companyName: u.companyName || null,
      createdAt: u.createdAt
    }));
    
    res.json({
      users: usersWithoutPassword,
      products,
      categories,
      reports
    });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});

// ========== ADMIN USER MANAGEMENT ROUTES ==========

// สร้าง User ใหม่ (Admin only)
app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, email, password, role, companyId, companyName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const users = readJSON(usersFile);
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    const newUser = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: role || 'user',
      companyId: companyId || null,
      companyName: companyName || null,
      createdAt: new Date().toISOString()
    };

    // บันทึกไปยัง MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        const mongoUser = new User({
          id: userId,
          username,
          email,
          password: hashedPassword,
          role: role || 'user',
          companyId: companyId || null,
          companyName: companyName || null,
          createdAt: new Date()
        });
        await mongoUser.save();
        console.log('✅ User saved to MongoDB by Admin');
      } catch (mongoError) {
        if (mongoError.code === 11000) {
          return res.status(400).json({ error: 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
        }
        console.error('MongoDB save error:', mongoError);
      }
    }

    users.push(newUser);
    writeJSON(usersFile, users);

    // ไม่ส่ง password กลับ
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' });
  }
});

// อัปเดต User (Admin only)
app.put('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { username, email, role, password, companyId, companyName } = req.body;
    const users = readJSON(usersFile);
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    const user = users[userIndex];

    // ตรวจสอบ email ซ้ำ (ยกเว้น user คนนี้)
    if (email && email !== user.email) {
      if (users.find(u => u.email === email && u.id !== req.params.id)) {
        return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
    }

    // ตรวจสอบ username ซ้ำ (ยกเว้น user คนนี้)
    if (username && username !== user.username) {
      if (users.find(u => u.username === username && u.id !== req.params.id)) {
        return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
      }
    }

    // อัปเดตข้อมูล
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof companyId !== 'undefined') {
      user.companyId = companyId || null;
    }
    if (typeof companyName !== 'undefined') {
      user.companyName = companyName || null;
    }
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user.id;

    // อัปเดต MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        await User.findOneAndUpdate(
          { id: req.params.id },
          {
            username: user.username,
            email: user.email,
            role: user.role,
            companyId: user.companyId || null,
            companyName: user.companyName || null,
            ...(password && { password: user.password })
          }
        );
        console.log('✅ User updated in MongoDB');
      } catch (mongoError) {
        console.error('MongoDB update error:', mongoError);
      }
    }

    writeJSON(usersFile, users);

    // ไม่ส่ง password กลับ
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      companyId: user.companyId || null,
      companyName: user.companyName || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตผู้ใช้' });
  }
});

// ลบ User (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = readJSON(usersFile);
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    // ป้องกันการลบตัวเอง
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' });
    }

    // ลบจาก MongoDB ถ้าเปิดใช้งาน
    if (useMongoDB) {
      try {
        await User.findOneAndDelete({ id: req.params.id });
        console.log('✅ User deleted from MongoDB');
      } catch (mongoError) {
        console.error('MongoDB delete error:', mongoError);
      }
    }

    const filtered = users.filter(u => u.id !== req.params.id);
    writeJSON(usersFile, filtered);
    
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
  }
});

// ========== HISTORICAL DATA ROUTES ==========

// ดึงประวัติการขาย (Admin only)
app.get('/api/admin/history/sales', authenticateToken, isAdmin, async (req, res) => {
  try {
    let salesHistory = [];
    
    if (useMongoDB) {
      try {
        const mongoSalesHistory = await SalesHistory.find().sort({ saleDate: -1 });
        salesHistory = mongoSalesHistory.map(sale => ({
          id: sale.id,
          orderId: sale.orderId,
          userId: sale.userId,
          username: sale.username,
          items: sale.items,
          totalPrice: sale.totalPrice,
          totalItems: sale.totalItems,
          saleDate: sale.saleDate,
          createdAt: sale.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB sales history fetch error:', mongoError);
        salesHistory = readJSON(salesHistoryFile);
      }
    } else {
      salesHistory = readJSON(salesHistoryFile);
    }
    
    res.json(salesHistory);
  } catch (error) {
    console.error('Get sales history error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการขาย' });
  }
});

// ดึงประวัติการเพิ่มสินค้า (Admin only)
app.get('/api/admin/history/product-additions', authenticateToken, isAdmin, async (req, res) => {
  try {
    let additionHistory = [];
    
    if (useMongoDB) {
      try {
        const mongoAdditionHistory = await ProductAdditionHistory.find().sort({ additionDate: -1 });
        additionHistory = mongoAdditionHistory.map(addition => ({
          id: addition.id,
          productId: addition.productId,
          productName: addition.productName,
          productDescription: addition.productDescription,
          price: addition.price,
          categoryId: addition.categoryId,
          stock: addition.stock,
          image: addition.image,
          addedBy: addition.addedBy,
          addedByUsername: addition.addedByUsername,
          additionDate: addition.additionDate,
          createdAt: addition.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB product addition history fetch error:', mongoError);
        additionHistory = readJSON(productAdditionHistoryFile);
      }
    } else {
      additionHistory = readJSON(productAdditionHistoryFile);
    }
    
    res.json(additionHistory);
  } catch (error) {
    console.error('Get product addition history error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการเพิ่มสินค้า' });
  }
});

// ดึงประวัติการลบสินค้า (Admin only)
app.get('/api/admin/history/product-deletions', authenticateToken, isAdmin, async (req, res) => {
  try {
    let deletionHistory = [];
    
    if (useMongoDB) {
      try {
        const mongoDeletionHistory = await ProductDeletionHistory.find().sort({ deletionDate: -1 });
        deletionHistory = mongoDeletionHistory.map(deletion => ({
          id: deletion.id,
          productId: deletion.productId,
          productName: deletion.productName,
          productDescription: deletion.productDescription,
          price: deletion.price,
          categoryId: deletion.categoryId,
          stock: deletion.stock,
          image: deletion.image,
          deletedBy: deletion.deletedBy,
          deletedByUsername: deletion.deletedByUsername,
          deletionDate: deletion.deletionDate,
          createdAt: deletion.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB product deletion history fetch error:', mongoError);
        deletionHistory = readJSON(productDeletionHistoryFile);
      }
    } else {
      deletionHistory = readJSON(productDeletionHistoryFile);
    }
    
    res.json(deletionHistory);
  } catch (error) {
    console.error('Get product deletion history error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติการลบสินค้า' });
  }
});

// ดึงประวัติทั้งหมด (Admin only)
app.get('/api/admin/history/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    let salesHistory = [];
    let additionHistory = [];
    let deletionHistory = [];
    
    if (useMongoDB) {
      try {
        const [mongoSalesHistory, mongoAdditionHistory, mongoDeletionHistory] = await Promise.all([
          SalesHistory.find().sort({ saleDate: -1 }),
          ProductAdditionHistory.find().sort({ additionDate: -1 }),
          ProductDeletionHistory.find().sort({ deletionDate: -1 })
        ]);
        
        salesHistory = mongoSalesHistory.map(sale => ({
          id: sale.id,
          orderId: sale.orderId,
          userId: sale.userId,
          username: sale.username,
          items: sale.items,
          totalPrice: sale.totalPrice,
          totalItems: sale.totalItems,
          saleDate: sale.saleDate,
          createdAt: sale.createdAt
        }));
        
        additionHistory = mongoAdditionHistory.map(addition => ({
          id: addition.id,
          productId: addition.productId,
          productName: addition.productName,
          productDescription: addition.productDescription,
          price: addition.price,
          categoryId: addition.categoryId,
          stock: addition.stock,
          image: addition.image,
          addedBy: addition.addedBy,
          addedByUsername: addition.addedByUsername,
          additionDate: addition.additionDate,
          createdAt: addition.createdAt
        }));
        
        deletionHistory = mongoDeletionHistory.map(deletion => ({
          id: deletion.id,
          productId: deletion.productId,
          productName: deletion.productName,
          productDescription: deletion.productDescription,
          price: deletion.price,
          categoryId: deletion.categoryId,
          stock: deletion.stock,
          image: deletion.image,
          deletedBy: deletion.deletedBy,
          deletedByUsername: deletion.deletedByUsername,
          deletionDate: deletion.deletionDate,
          createdAt: deletion.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB history fetch error:', mongoError);
        salesHistory = readJSON(salesHistoryFile);
        additionHistory = readJSON(productAdditionHistoryFile);
        deletionHistory = readJSON(productDeletionHistoryFile);
      }
    } else {
      salesHistory = readJSON(salesHistoryFile);
      additionHistory = readJSON(productAdditionHistoryFile);
      deletionHistory = readJSON(productDeletionHistoryFile);
    }
    
    res.json({
      sales: salesHistory,
      additions: additionHistory,
      deletions: deletionHistory
    });
  } catch (error) {
    console.error('Get all history error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงประวัติทั้งหมด' });
  }
});

// ========== ORDER MANAGEMENT ROUTES ==========

// ดึงคำสั่งซื้อทั้งหมด
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { status, paymentStatus, deliveryStatus } = req.query;
    let orders = [];
    
    if (useMongoDB) {
      try {
        const query = {};
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (deliveryStatus) query.deliveryStatus = deliveryStatus;
        // ถ้าไม่ใช่ admin ให้แสดงเฉพาะ order ของตัวเอง
        if (req.user.role !== 'admin') {
          query.userId = req.user.id;
        }
        const mongoOrders = await Order.find(query).sort({ createdAt: -1 });
        orders = mongoOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          username: order.username,
          items: order.items,
          totalPrice: order.totalPrice,
          totalCost: order.totalCost,
          totalImportCost: order.totalImportCost,
          profit: order.profit,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
          invoiceId: order.invoiceId,
          debitNoteId: order.debitNoteId,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
          cancelledBy: order.cancelledBy,
          cancelledReason: order.cancelledReason
        }));
      } catch (mongoError) {
        console.error('MongoDB orders fetch error:', mongoError);
        orders = readJSON(ordersFile);
      }
    } else {
      orders = readJSON(ordersFile);
    }
    
    // Filter by status if not using MongoDB
    if (!useMongoDB) {
      if (status) orders = orders.filter(o => o.status === status);
      if (paymentStatus) orders = orders.filter(o => o.paymentStatus === paymentStatus);
      if (deliveryStatus) orders = orders.filter(o => o.deliveryStatus === deliveryStatus);
      // ถ้าไม่ใช่ admin ให้แสดงเฉพาะ order ของตัวเอง
      if (req.user.role !== 'admin') {
        orders = orders.filter(o => o.userId === req.user.id);
      }
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงคำสั่งซื้อ' });
  }
});

// ดึงคำสั่งซื้อตาม ID
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    let order = null;
    
    if (useMongoDB) {
      try {
        const mongoOrder = await Order.findOne({ id: req.params.id });
        if (!mongoOrder) {
          return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
        }
        // ตรวจสอบสิทธิ์
        if (req.user.role !== 'admin' && mongoOrder.userId !== req.user.id) {
          return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้' });
        }
        order = {
          id: mongoOrder.id,
          orderNumber: mongoOrder.orderNumber,
          userId: mongoOrder.userId,
          username: mongoOrder.username,
          items: mongoOrder.items,
          totalPrice: mongoOrder.totalPrice,
          totalCost: mongoOrder.totalCost,
          totalImportCost: mongoOrder.totalImportCost,
          profit: mongoOrder.profit,
          status: mongoOrder.status,
          paymentStatus: mongoOrder.paymentStatus,
          deliveryStatus: mongoOrder.deliveryStatus,
          invoiceId: mongoOrder.invoiceId,
          debitNoteId: mongoOrder.debitNoteId,
          notes: mongoOrder.notes,
          createdAt: mongoOrder.createdAt,
          updatedAt: mongoOrder.updatedAt,
          completedAt: mongoOrder.completedAt,
          cancelledAt: mongoOrder.cancelledAt,
          cancelledBy: mongoOrder.cancelledBy,
          cancelledReason: mongoOrder.cancelledReason
        };
      } catch (mongoError) {
        console.error('MongoDB order fetch error:', mongoError);
        const orders = readJSON(ordersFile);
        order = orders.find(o => o.id === req.params.id);
      }
    } else {
      const orders = readJSON(ordersFile);
      order = orders.find(o => o.id === req.params.id);
    }
    
    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    // ตรวจสอบสิทธิ์
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงคำสั่งซื้อ' });
  }
});

// อัปเดตสถานะคำสั่งซื้อ (Admin only)
app.put('/api/orders/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, paymentStatus, deliveryStatus, notes } = req.body;
    
    let order = null;
    const orders = readJSON(ordersFile);
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    order = orders[orderIndex];
    
    if (status) {
      order.status = status;
      if (status === 'completed') {
        order.completedAt = new Date().toISOString();
      } else if (status === 'cancelled') {
        order.cancelledAt = new Date().toISOString();
        order.cancelledBy = req.user.id;
        order.cancelledReason = notes || 'ยกเลิกโดย Admin';
      }
    }
    
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    if (notes !== undefined) order.notes = notes;
    
    order.updatedAt = new Date().toISOString();
    
    writeJSON(ordersFile, orders);
    
    // อัปเดต MongoDB
    if (useMongoDB) {
      try {
        const updateData = {
          updatedAt: new Date()
        };
        if (status) {
          updateData.status = status;
          if (status === 'completed') {
            updateData.completedAt = new Date();
          } else if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
            updateData.cancelledBy = req.user.id;
            updateData.cancelledReason = notes || 'ยกเลิกโดย Admin';
          }
        }
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (deliveryStatus) updateData.deliveryStatus = deliveryStatus;
        if (notes !== undefined) updateData.notes = notes;
        
        await Order.findOneAndUpdate({ id: req.params.id }, updateData);
        console.log('✅ Order updated in MongoDB');
      } catch (mongoError) {
        console.error('MongoDB order update error:', mongoError);
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำสั่งซื้อ' });
  }
});

// ผู้ใช้ (บริษัท) ยืนยันได้รับสินค้า (ของตัวเองเท่านั้น)
app.put('/api/orders/:id/confirm-received', authenticateToken, async (req, res) => {
  try {
    const orders = readJSON(ordersFile);
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    const order = orders[orderIndex];
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้' });
    }

    order.deliveryStatus = 'delivered';
    order.status = 'completed';
    order.paymentStatus = order.paymentStatus || 'unpaid';
    order.completedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    writeJSON(ordersFile, orders);

    if (useMongoDB) {
      try {
        await Order.findOneAndUpdate(
          { id: req.params.id },
          { deliveryStatus: 'delivered', status: 'completed', completedAt: new Date(), updatedAt: new Date() }
        );
      } catch (mongoError) {
        console.error('MongoDB confirm received error:', mongoError);
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Confirm received error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยืนยันรับสินค้า' });
  }
});

// ผู้ใช้ (บริษัท) ยกเลิกคำสั่งซื้อ (ของตัวเองเท่านั้น) - ถ้ายังไม่ completed
app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const orders = readJSON(ordersFile);
    const orderIndex = orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    const order = orders[orderIndex];
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้' });
    }
    if (order.status === 'completed') {
      return res.status(400).json({ error: 'ไม่สามารถยกเลิกคำสั่งซื้อที่เสร็จสมบูรณ์แล้ว' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    order.cancelledBy = req.user.id;
    order.cancelledReason = reason || 'ยกเลิกโดยผู้ใช้';
    order.updatedAt = new Date().toISOString();
    writeJSON(ordersFile, orders);

    if (useMongoDB) {
      try {
        await Order.findOneAndUpdate(
          { id: req.params.id },
          { status: 'cancelled', cancelledAt: new Date(), cancelledBy: req.user.id, cancelledReason: order.cancelledReason, updatedAt: new Date() }
        );
      } catch (mongoError) {
        console.error('MongoDB cancel order error:', mongoError);
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกสินค้า' });
  }
});

// ========== WITHDRAWAL ROUTES (เบิกสินค้า) ==========

// ดึงรายการเบิกสินค้า (Admin เห็นทั้งหมด, company_user เห็นของตัวเอง/บริษัทตัวเอง)
app.get('/api/withdrawals', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    let withdrawals = [];
    if (useMongoDB) {
      try {
        const query = {};
        if (req.user.role !== 'admin') {
          query.withdrawnBy = req.user.id;
        }
        const mongo = await Withdrawal.find(query).sort({ withdrawnAt: -1 });
        withdrawals = mongo.map(w => ({
          id: w.id,
          companyName: w.companyName,
          companyId: w.companyId,
          productCode: w.productCode,
          productId: w.productId,
          productName: w.productName,
          quantity: w.quantity,
          withdrawPrice: w.withdrawPrice,
          totalAmount: w.totalAmount,
          withdrawnAt: w.withdrawnAt,
          withdrawnBy: w.withdrawnBy,
          withdrawnByUsername: w.withdrawnByUsername,
          status: w.status || 'pending',
          trackingCode: w.trackingCode || null,
          createdAt: w.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB withdrawals fetch error:', mongoError);
        withdrawals = readJSON(withdrawalsFile);
      }
    } else {
      withdrawals = readJSON(withdrawalsFile);
    }

    if (!useMongoDB && req.user.role !== 'admin') {
      withdrawals = withdrawals.filter(w => w.withdrawnBy === req.user.id);
    }

    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการเบิกสินค้า' });
  }
});

// เบิกสินค้า (ลด stock + บันทึกประวัติ) - admin หรือ company_user
app.post('/api/withdrawals', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    const { companyName, productCode, productId, productName, quantity, withdrawPrice, fromLocation, toLocation } = req.body;
    if (!companyName || !productCode || !productName || !quantity || !withdrawPrice || !fromLocation || !toLocation) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const qty = parseInt(quantity);
    const price = parseFloat(withdrawPrice);
    if (qty <= 0 || price < 0) {
      return res.status(400).json({ error: 'จำนวนหรือราคาไม่ถูกต้อง' });
    }

    // ตรวจสอบสินค้าและหาข้อมูลเจ้าของสินค้า
    const products = readJSON(productsFile);
    const users = readJSON(usersFile);
    let target = null;
    if (productId) {
      target = products.find(p => p.id === productId);
    } else {
      // fallback: match by name
      target = products.find(p => p.name === productName);
    }

    if (!target) {
      return res.status(404).json({ error: 'ไม่พบสินค้า' });
    }

    // ตรวจสอบว่าสินค้าเป็นของสาขาไหน
    const productOwner = target.createdBy ? users.find(u => u.id === target.createdBy) : null;
    const isOwnProduct = productOwner && productOwner.id === req.user.id;
    const isDifferentBranch = productOwner && productOwner.companyId && productOwner.companyId !== req.user.companyId;

    let withdrawalStatus = 'pending';
    let requestedFromCompanyId = null;
    let requestedFromCompanyName = null;
    let requestedFromUserId = null;

    // ถ้าสินค้าเป็นของสาขาอื่น ให้สร้างคำขออนุมัติ
    if (isDifferentBranch && productOwner) {
      withdrawalStatus = 'pending_approval';
      requestedFromCompanyId = productOwner.companyId;
      requestedFromCompanyName = productOwner.companyName;
      requestedFromUserId = productOwner.id;
      
      // ตรวจสอบสต็อกแต่ยังไม่ลด (รออนุมัติก่อน)
      if ((target.stock || 0) < qty) {
        return res.status(400).json({ error: `สต็อกไม่พอ (เหลือ ${target.stock} ชิ้น)` });
      }
    } else if (isOwnProduct) {
      // ถ้าเป็นสินค้าของตัวเอง ให้ลด stock ทันที
      if ((target.stock || 0) < qty) {
        return res.status(400).json({ error: `สต็อกไม่พอ (เหลือ ${target.stock} ชิ้น)` });
      }
      target.stock -= qty;
      target.updatedAt = new Date().toISOString();
      writeJSON(productsFile, products);
    } else {
      // กรณีอื่นๆ (เช่น Admin เบิกสินค้า) ให้ลด stock ทันที
      if ((target.stock || 0) < qty) {
        return res.status(400).json({ error: `สต็อกไม่พอ (เหลือ ${target.stock} ชิ้น)` });
      }
      target.stock -= qty;
      target.updatedAt = new Date().toISOString();
      writeJSON(productsFile, products);
    }

    const id = Date.now().toString() + '-wd';
    const trackingCode = 'TRK-' + Date.now().toString(); // รหัสพัสดุภายในอัตโนมัติ
    const totalAmount = qty * price;
    const withdrawal = {
      id,
      companyName,
      companyId: req.user.companyId || null,
      productCode,
      productId: productId || target.id,
      productName: productName || target.name,
      quantity: qty,
      withdrawPrice: price,
      totalAmount,
      fromLocation,
      toLocation,
      withdrawnAt: new Date().toISOString(),
      withdrawnBy: req.user.id,
      withdrawnByUsername: req.user.username,
      status: withdrawalStatus,
      trackingCode,
      requestedFromCompanyId,
      requestedFromCompanyName,
      requestedFromUserId,
      createdAt: new Date().toISOString()
    };

    const withdrawals = readJSON(withdrawalsFile);
    withdrawals.push(withdrawal);
    writeJSON(withdrawalsFile, withdrawals);

    if (useMongoDB) {
      try {
        await new Withdrawal({
          ...withdrawal,
          withdrawnAt: new Date(withdrawal.withdrawnAt),
          createdAt: new Date(withdrawal.createdAt)
        }).save();
      } catch (mongoError) {
        console.error('MongoDB withdrawal save error:', mongoError);
      }
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเบิกสินค้า' });
  }
});

// ดึงคำขอเบิกสินค้าที่รออนุมัติจากสาขา
app.get('/api/withdrawals/pending-approval', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    let withdrawals = [];
    
    if (useMongoDB) {
      try {
        const mongoWithdrawals = await Withdrawal.find({ 
          status: 'pending_approval',
          requestedFromCompanyId: req.user.companyId 
        }).sort({ createdAt: -1 });
        withdrawals = mongoWithdrawals.map(w => ({
          id: w.id,
          companyName: w.companyName,
          companyId: w.companyId,
          productCode: w.productCode,
          productId: w.productId,
          productName: w.productName,
          quantity: w.quantity,
          withdrawPrice: w.withdrawPrice,
          totalAmount: w.totalAmount,
          fromLocation: w.fromLocation,
          toLocation: w.toLocation,
          withdrawnAt: w.withdrawnAt,
          withdrawnBy: w.withdrawnBy,
          withdrawnByUsername: w.withdrawnByUsername,
          status: w.status,
          trackingCode: w.trackingCode || null,
          requestedFromCompanyId: w.requestedFromCompanyId,
          requestedFromCompanyName: w.requestedFromCompanyName,
          requestedFromUserId: w.requestedFromUserId,
          createdAt: w.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB withdrawals fetch error:', mongoError);
        withdrawals = readJSON(withdrawalsFile);
      }
    } else {
      withdrawals = readJSON(withdrawalsFile);
    }

    // กรองเฉพาะคำขอที่รออนุมัติและเป็นของสาขานี้
    withdrawals = withdrawals.filter(w => 
      w.status === 'pending_approval' && 
      w.requestedFromCompanyId === req.user.companyId
    );

    res.json(withdrawals);
  } catch (error) {
    console.error('Get pending approval withdrawals error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการคำขอเบิกสินค้า' });
  }
});

// อนุมัติคำขอเบิกสินค้า
app.patch('/api/withdrawals/:id/approve', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    let withdrawals = [];
    
    if (useMongoDB) {
      try {
        withdrawals = await Withdrawal.find({});
        withdrawals = withdrawals.map(w => ({
          id: w.id,
          companyName: w.companyName,
          companyId: w.companyId,
          productCode: w.productCode,
          productId: w.productId,
          productName: w.productName,
          quantity: w.quantity,
          withdrawPrice: w.withdrawPrice,
          totalAmount: w.totalAmount,
          fromLocation: w.fromLocation,
          toLocation: w.toLocation,
          withdrawnAt: w.withdrawnAt,
          withdrawnBy: w.withdrawnBy,
          withdrawnByUsername: w.withdrawnByUsername,
          status: w.status,
          trackingCode: w.trackingCode || null,
          requestedFromCompanyId: w.requestedFromCompanyId,
          requestedFromCompanyName: w.requestedFromCompanyName,
          requestedFromUserId: w.requestedFromUserId,
          createdAt: w.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB withdrawals fetch error:', mongoError);
        withdrawals = readJSON(withdrawalsFile);
      }
    } else {
      withdrawals = readJSON(withdrawalsFile);
    }

    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'ไม่พบคำขอเบิกสินค้า' });
    }

    // ตรวจสอบสิทธิ์: ต้องเป็นสาขาเจ้าของสินค้า
    if (withdrawal.requestedFromCompanyId !== req.user.companyId) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์อนุมัติคำขอนี้' });
    }

    if (withdrawal.status !== 'pending_approval') {
      return res.status(400).json({ error: 'คำขอนี้ไม่อยู่ในสถานะรออนุมัติ' });
    }

    // ลด stock ของสินค้า
    const products = readJSON(productsFile);
    const product = products.find(p => p.id === withdrawal.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'ไม่พบสินค้า' });
    }

    if ((product.stock || 0) < withdrawal.quantity) {
      return res.status(400).json({ error: `สต็อกไม่พอ (เหลือ ${product.stock} ชิ้น)` });
    }

    product.stock -= withdrawal.quantity;
    product.updatedAt = new Date().toISOString();
    writeJSON(productsFile, products);

    // อัปเดตสถานะเป็น approved
    withdrawal.status = 'approved';
    
    const withdrawalIndex = withdrawals.findIndex(w => w.id === req.params.id);
    withdrawals[withdrawalIndex] = withdrawal;
    writeJSON(withdrawalsFile, withdrawals);

    if (useMongoDB) {
      try {
        await Withdrawal.findOneAndUpdate(
          { id: req.params.id },
          { 
            status: 'approved',
            updatedAt: new Date()
          }
        );
      } catch (mongoError) {
        console.error('MongoDB withdrawal update error:', mongoError);
      }
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ' });
  }
});

// ปฏิเสธคำขอเบิกสินค้า
app.patch('/api/withdrawals/:id/reject', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    let withdrawals = [];
    
    if (useMongoDB) {
      try {
        withdrawals = await Withdrawal.find({});
        withdrawals = withdrawals.map(w => ({
          id: w.id,
          companyName: w.companyName,
          companyId: w.companyId,
          productCode: w.productCode,
          productId: w.productId,
          productName: w.productName,
          quantity: w.quantity,
          withdrawPrice: w.withdrawPrice,
          totalAmount: w.totalAmount,
          fromLocation: w.fromLocation,
          toLocation: w.toLocation,
          withdrawnAt: w.withdrawnAt,
          withdrawnBy: w.withdrawnBy,
          withdrawnByUsername: w.withdrawnByUsername,
          status: w.status,
          trackingCode: w.trackingCode || null,
          requestedFromCompanyId: w.requestedFromCompanyId,
          requestedFromCompanyName: w.requestedFromCompanyName,
          requestedFromUserId: w.requestedFromUserId,
          createdAt: w.createdAt
        }));
      } catch (mongoError) {
        console.error('MongoDB withdrawals fetch error:', mongoError);
        withdrawals = readJSON(withdrawalsFile);
      }
    } else {
      withdrawals = readJSON(withdrawalsFile);
    }

    const withdrawal = withdrawals.find(w => w.id === req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'ไม่พบคำขอเบิกสินค้า' });
    }

    // ตรวจสอบสิทธิ์: ต้องเป็นสาขาเจ้าของสินค้า
    if (withdrawal.requestedFromCompanyId !== req.user.companyId) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ปฏิเสธคำขอนี้' });
    }

    if (withdrawal.status !== 'pending_approval') {
      return res.status(400).json({ error: 'คำขอนี้ไม่อยู่ในสถานะรออนุมัติ' });
    }

    // อัปเดตสถานะเป็น rejected
    withdrawal.status = 'rejected';
    
    const withdrawalIndex = withdrawals.findIndex(w => w.id === req.params.id);
    withdrawals[withdrawalIndex] = withdrawal;
    writeJSON(withdrawalsFile, withdrawals);

    if (useMongoDB) {
      try {
        await Withdrawal.findOneAndUpdate(
          { id: req.params.id },
          { 
            status: 'rejected',
            updatedAt: new Date()
          }
        );
      } catch (mongoError) {
        console.error('MongoDB withdrawal update error:', mongoError);
      }
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ' });
  }
});

// อัปเดตสถานะการจัดส่งของการเบิกสินค้า
// Admin: เปลี่ยนได้เป็น shipping / delivered
// User สาขา (company_user): เปลี่ยนเป็น received ได้เมื่อสถานะปัจจุบันคือ delivered
app.patch('/api/withdrawals/:id/status', authenticateToken, isAdminOrCompany, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'กรุณาระบุสถานะ' });
    }

    const allowedStatuses = ['pending', 'shipping', 'delivered', 'received'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    let withdrawals = readJSON(withdrawalsFile);
    const index = withdrawals.findIndex(w => w.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'ไม่พบรายการเบิกสินค้า' });
    }

    const withdrawal = withdrawals[index];

    // สิทธิ์ในการเปลี่ยนสถานะ
    if (req.user.role === 'admin') {
      // admin ใช้สำหรับอัปเดตสถานะการจัดส่ง
      if (!['pending', 'shipping', 'delivered'].includes(status)) {
        return res.status(400).json({ error: 'Admin สามารถตั้งสถานะได้แค่ pending, shipping, delivered' });
      }
    } else {
      // company_user สามารถเปลี่ยนเป็น received เมื่อของถึงที่หมายแล้ว
      if (status !== 'received') {
        return res.status(400).json({ error: 'ผู้ใช้สาขาสามารถยืนยันได้เฉพาะสถานะรับสินค้าแล้ว' });
      }
      if (withdrawal.status !== 'delivered') {
        return res.status(400).json({ error: 'สามารถยืนยันรับสินค้าได้เมื่อสถานะเป็นสินค้าถึงที่หมายแล้วเท่านั้น' });
      }
      if (withdrawal.withdrawnBy !== req.user.id && withdrawal.companyId !== (req.user.companyId || null)) {
        return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เปลี่ยนสถานะรายการนี้' });
      }
    }

    withdrawal.status = status;
    withdrawals[index] = withdrawal;
    writeJSON(withdrawalsFile, withdrawals);

    // อัปเดตใน MongoDB ถ้าใช้
    if (useMongoDB) {
      try {
        await Withdrawal.findOneAndUpdate({ id: req.params.id }, { status });
      } catch (mongoError) {
        console.error('MongoDB withdrawal status update error:', mongoError);
      }
    }

    res.json(withdrawal);
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะการเบิกสินค้า' });
  }
});

// ========== INVOICE ROUTES ==========

// สร้างใบแจ้งหนี้ (Admin only)
app.post('/api/invoices', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId, tax, discount, dueDate, notes } = req.body;
    
    const orders = readJSON(ordersFile);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'ไม่สามารถสร้างใบแจ้งหนี้สำหรับคำสั่งซื้อที่ยกเลิกแล้ว' });
    }
    
    const invoiceId = Date.now().toString();
    const invoiceNumber = 'INV-' + Date.now();
    const subtotal = order.totalPrice;
    const taxAmount = parseFloat(tax || 0);
    const discountAmount = parseFloat(discount || 0);
    const totalAmount = subtotal + taxAmount - discountAmount;
    
    const invoice = {
      id: invoiceId,
      invoiceNumber: invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      username: order.username,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      subtotal: subtotal,
      tax: taxAmount,
      discount: discountAmount,
      totalAmount: totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'issued',
      issueDate: new Date().toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // บันทึกใบแจ้งหนี้
    const invoices = readJSON(invoicesFile);
    invoices.push(invoice);
    writeJSON(invoicesFile, invoices);
    
    // อัปเดต Order ให้ลิงก์ไปยัง Invoice
    order.invoiceId = invoiceId;
    order.updatedAt = new Date().toISOString();
    writeJSON(ordersFile, orders);
    
    // บันทึกไปยัง MongoDB
    if (useMongoDB) {
      try {
        const mongoInvoice = new Invoice({
          id: invoiceId,
          invoiceNumber: invoiceNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          username: order.username,
          items: invoice.items,
          subtotal: subtotal,
          tax: taxAmount,
          discount: discountAmount,
          totalAmount: totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          status: 'issued',
          issueDate: new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await mongoInvoice.save();
        
        await Order.findOneAndUpdate(
          { id: orderId },
          { invoiceId: invoiceId, updatedAt: new Date() }
        );
        
        console.log('✅ Invoice saved to MongoDB');
      } catch (mongoError) {
        console.error('MongoDB invoice save error:', mongoError);
      }
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้' });
  }
});

// ดึงใบแจ้งหนี้ทั้งหมด
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    let invoices = [];
    
    if (useMongoDB) {
      try {
        const query = {};
        if (req.user.role !== 'admin') {
          query.userId = req.user.id;
        }
        const mongoInvoices = await Invoice.find(query).sort({ issueDate: -1 });
        invoices = mongoInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          orderId: inv.orderId,
          orderNumber: inv.orderNumber,
          userId: inv.userId,
          username: inv.username,
          items: inv.items,
          subtotal: inv.subtotal,
          tax: inv.tax,
          discount: inv.discount,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          remainingAmount: inv.remainingAmount,
          status: inv.status,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          paidDate: inv.paidDate,
          notes: inv.notes,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt
        }));
      } catch (mongoError) {
        console.error('MongoDB invoices fetch error:', mongoError);
        invoices = readJSON(invoicesFile);
      }
    } else {
      invoices = readJSON(invoicesFile);
      if (req.user.role !== 'admin') {
        invoices = invoices.filter(inv => inv.userId === req.user.id);
      }
    }
    
    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงใบแจ้งหนี้' });
  }
});

// อัปเดตสถานะการชำระเงินใบแจ้งหนี้
app.put('/api/invoices/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { paidAmount } = req.body;
    
    const invoices = readJSON(invoicesFile);
    const invoiceIndex = invoices.findIndex(inv => inv.id === req.params.id);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'ไม่พบใบแจ้งหนี้' });
    }
    
    const invoice = invoices[invoiceIndex];
    
    // ตรวจสอบสิทธิ์
    if (req.user.role !== 'admin' && invoice.userId !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงใบแจ้งหนี้นี้' });
    }
    
    const paymentAmount = parseFloat(paidAmount || 0);
    invoice.paidAmount = (invoice.paidAmount || 0) + paymentAmount;
    invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
    
    if (invoice.remainingAmount <= 0) {
      invoice.status = 'paid';
      invoice.paidDate = new Date().toISOString();
      
      // อัปเดต Order payment status
      const orders = readJSON(ordersFile);
      const order = orders.find(o => o.invoiceId === invoice.id);
      if (order) {
        order.paymentStatus = 'paid';
        order.updatedAt = new Date().toISOString();
        writeJSON(ordersFile, orders);
        
        if (useMongoDB) {
          await Order.findOneAndUpdate(
            { id: order.id },
            { paymentStatus: 'paid', updatedAt: new Date() }
          );
        }
      }
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }
    
    invoice.updatedAt = new Date().toISOString();
    writeJSON(invoicesFile, invoices);
    
    // อัปเดต MongoDB
    if (useMongoDB) {
      try {
        await Invoice.findOneAndUpdate(
          { id: req.params.id },
          {
            paidAmount: invoice.paidAmount,
            remainingAmount: invoice.remainingAmount,
            status: invoice.status,
            paidDate: invoice.paidDate ? new Date(invoice.paidDate) : null,
            updatedAt: new Date()
          }
        );
        console.log('✅ Invoice payment updated in MongoDB');
      } catch (mongoError) {
        console.error('MongoDB invoice update error:', mongoError);
      }
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Update invoice payment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตการชำระเงิน' });
  }
});

// ========== DEBIT NOTE ROUTES ==========

// สร้างใบลดหนี้ (Admin only)
app.post('/api/debit-notes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { invoiceId, reason, items, notes } = req.body;
    
    const invoices = readJSON(invoicesFile);
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'ไม่พบใบแจ้งหนี้' });
    }
    
    const orders = readJSON(ordersFile);
    const order = orders.find(o => o.id === invoice.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    const debitNoteId = Date.now().toString();
    const debitNoteNumber = 'DN-' + Date.now();
    
    // คำนวณยอดรวมจาก items ที่ส่งมา หรือใช้ items จาก invoice
    const debitItems = items || invoice.items;
    const totalAmount = debitItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    const debitNote = {
      id: debitNoteId,
      debitNoteNumber: debitNoteNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      username: order.username,
      reason: reason || 'ไม่ระบุ',
      items: debitItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      totalAmount: totalAmount,
      status: 'issued',
      issueDate: new Date().toISOString(),
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // บันทึกใบลดหนี้
    const debitNotes = readJSON(debitNotesFile);
    debitNotes.push(debitNote);
    writeJSON(debitNotesFile, debitNotes);
    
    // อัปเดต Invoice และ Order
    invoice.remainingAmount = Math.max(0, invoice.remainingAmount - totalAmount);
    invoice.updatedAt = new Date().toISOString();
    writeJSON(invoicesFile, invoices);
    
    order.debitNoteId = debitNoteId;
    order.updatedAt = new Date().toISOString();
    writeJSON(ordersFile, orders);
    
    // บันทึกไปยัง MongoDB
    if (useMongoDB) {
      try {
        const mongoDebitNote = new DebitNote({
          id: debitNoteId,
          debitNoteNumber: debitNoteNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          username: order.username,
          reason: reason || 'ไม่ระบุ',
          items: debitNote.items,
          totalAmount: totalAmount,
          status: 'issued',
          issueDate: new Date(),
          notes: notes || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await mongoDebitNote.save();
        
        await Invoice.findOneAndUpdate(
          { id: invoiceId },
          { remainingAmount: invoice.remainingAmount, updatedAt: new Date() }
        );
        
        await Order.findOneAndUpdate(
          { id: order.id },
          { debitNoteId: debitNoteId, updatedAt: new Date() }
        );
        
        console.log('✅ Debit note saved to MongoDB');
      } catch (mongoError) {
        console.error('MongoDB debit note save error:', mongoError);
      }
    }
    
    res.json(debitNote);
  } catch (error) {
    console.error('Create debit note error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างใบลดหนี้' });
  }
});

// ดึงใบลดหนี้ทั้งหมด
app.get('/api/debit-notes', authenticateToken, async (req, res) => {
  try {
    let debitNotes = [];
    
    if (useMongoDB) {
      try {
        const query = {};
        if (req.user.role !== 'admin') {
          query.userId = req.user.id;
        }
        const mongoDebitNotes = await DebitNote.find(query).sort({ issueDate: -1 });
        debitNotes = mongoDebitNotes.map(dn => ({
          id: dn.id,
          debitNoteNumber: dn.debitNoteNumber,
          invoiceId: dn.invoiceId,
          invoiceNumber: dn.invoiceNumber,
          orderId: dn.orderId,
          orderNumber: dn.orderNumber,
          userId: dn.userId,
          username: dn.username,
          reason: dn.reason,
          items: dn.items,
          totalAmount: dn.totalAmount,
          status: dn.status,
          issueDate: dn.issueDate,
          notes: dn.notes,
          createdAt: dn.createdAt,
          updatedAt: dn.updatedAt
        }));
      } catch (mongoError) {
        console.error('MongoDB debit notes fetch error:', mongoError);
        debitNotes = readJSON(debitNotesFile);
      }
    } else {
      debitNotes = readJSON(debitNotesFile);
      if (req.user.role !== 'admin') {
        debitNotes = debitNotes.filter(dn => dn.userId === req.user.id);
      }
    }
    
    res.json(debitNotes);
  } catch (error) {
    console.error('Get debit notes error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงใบลดหนี้' });
  }
});

// ========== PROFIT & COST CALCULATION ROUTES ==========

// คำนวณรายงานต้นทุนและกำไร (Admin only)
app.get('/api/admin/reports/profit', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let orders = [];
    
    if (useMongoDB) {
      try {
        const query = {};
        if (startDate || endDate) {
          query.createdAt = {};
          if (startDate) query.createdAt.$gte = new Date(startDate);
          if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        const mongoOrders = await Order.find(query);
        orders = mongoOrders.map(order => ({
          totalPrice: order.totalPrice,
          totalCost: order.totalCost,
          totalImportCost: order.totalImportCost,
          profit: order.profit,
          status: order.status
        }));
      } catch (mongoError) {
        console.error('MongoDB profit report fetch error:', mongoError);
        orders = readJSON(ordersFile);
      }
    } else {
      orders = readJSON(ordersFile);
      if (startDate || endDate) {
        orders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          if (startDate && orderDate < new Date(startDate)) return false;
          if (endDate && orderDate > new Date(endDate)) return false;
          return true;
        });
      }
    }
    
    // กรองเฉพาะคำสั่งซื้อที่เสร็จสมบูรณ์
    const completedOrders = orders.filter(o => o.status === 'completed');
    
    const report = {
      totalOrders: completedOrders.length,
      totalRevenue: completedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0),
      totalCost: completedOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
      totalImportCost: completedOrders.reduce((sum, o) => sum + (o.totalImportCost || 0), 0),
      totalProfit: completedOrders.reduce((sum, o) => sum + (o.profit || 0), 0),
      profitMargin: 0
    };
    
    if (report.totalRevenue > 0) {
      report.profitMargin = ((report.totalProfit / report.totalRevenue) * 100).toFixed(2);
    }
    
    res.json(report);
  } catch (error) {
    console.error('Get profit report error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการคำนวณรายงานกำไร' });
  }
});

// Error handling สำหรับ multer
app.use((error, req, res, next) => {
  console.error('Multer error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'ชื่อ field ของไฟล์ไม่ถูกต้อง' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

// เริ่มต้น server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server กำลังทำงานที่ http://0.0.0.0:${PORT}`);
  console.log(`📁 ข้อมูลถูกเก็บไว้ในโฟลเดอร์: ${dataDir}`);
  console.log(`🌐 สามารถเข้าถึงได้จาก:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://[YOUR_IP_ADDRESS]:${PORT}`);
  
  // สร้าง Admin user เริ่มต้นถ้ายังไม่มี
  const users = readJSON(usersFile);
  const adminExists = users.find(u => u.role === 'admin');
  if (!adminExists) {
    console.log('⚠️  ยังไม่มี Admin user - กรุณาสร้าง Admin user ผ่าน API หรือแก้ไขไฟล์ users.json');
  }
});

