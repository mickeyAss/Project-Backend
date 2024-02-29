import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();
var jwt = require('jsonwebtoken');
const secret = 'Fullstack-Login-2021'

router.get("/", (req, res) => {
  conn.query("SELECT * FROM `users`", (err, result) => {
    res.json(result);
  });
});



router.post("/register", (req, res) => {
  conn.query(
    "INSERT INTO users (`username`, `email`, `password` ,`type`) VALUES (?, ?, ?, ?)",
    [req.body.username, req.body.email, req.body.password, "user"],
    (err, result) => {
      res.json(result);
    }
  );
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // ตรวจสอบว่ามีอีเมลและรหัสผ่านในฐานข้อมูลหรือไม่
  if (email && password) {
    conn.query(
      "SELECT * FROM users WHERE email=? AND password=?",
      [email, password],
      (err, result) => {
        if (err) {
          res.json({ result: false, message: "Database error" });
          return;
        }
        if (result.length == 0) {
          res.json({ result: false, message: "Invalid email or password" });
          return;
        }
        var token = jwt.sign({ email: result[0].email }, secret, { expiresIn: '1h' });
        res.json({ result: true, data: { token } });
      }
    );
  } else {
    res.json({ result: false, message: "Email and password are required" });
  }
});

router.post('/authen', (req,res)=>{
  try{
    const token = req.headers.authorization?.split(' ')[1];
    var decoded = jwt.verify(token,secret);
    res.json({status: 'ok',decoded});
  }catch(err){
    res.json({status: 'error'});
  }
})

router.get("/:token", (req, res) => {
  const token = req.params.token; // รับ token จากพารามิเตอร์ URL
  try {
    // ตรวจสอบ token ว่าถูกต้องหรือไม่
    var decoded = jwt.verify(token, secret);
    // หาผู้ใช้จากฐานข้อมูลโดยใช้อีเมลที่ถูกเข้ารหัสใน token
    conn.query("SELECT * FROM `users` WHERE email = ?", [decoded.email], (err, result) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
        return;
      }
      if (result.length === 0) {
        res.status(404).json({ status: "error", message: "User not found" });
        return;
      }
      res.json(result[0]); // ส่งข้อมูลผู้ใช้ที่พบกลับไป
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ status: "error", message: "Unauthorized" }); // ส่งข้อความ Unauthorized หาก token ไม่ถูกต้อง
  }
});
