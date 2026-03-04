const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

async function createAdmin() {
    const username = process.argv[2] || 'admin';
    const email = process.argv[3] || 'admin@maket.com';
    const password = process.argv[4] || 'admin123';
    
    let users = [];
    if (fs.existsSync(usersFile)) {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    }
    
    // ตรวจสอบว่ามี admin อยู่แล้วหรือไม่
    const existingAdmin = users.find(u => u.role === 'admin');
    if (existingAdmin) {
        console.log('⚠️  มี Admin user อยู่แล้ว:', existingAdmin.username);
        console.log('หากต้องการสร้าง Admin ใหม่ กรุณาลบ Admin เดิมออกจากไฟล์ users.json');
        return;
    }
    
    // ตรวจสอบว่ามี username หรือ email ซ้ำหรือไม่
    if (users.find(u => u.username === username)) {
        console.log('❌ ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        console.log('❌ อีเมลนี้ถูกใช้งานแล้ว');
        return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = {
        id: Date.now().toString(),
        username,
        email,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
    };
    
    users.push(adminUser);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    console.log('✅ สร้าง Admin user สำเร็จ!');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  อย่าลืมเปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบ!');
}

createAdmin().catch(console.error);

