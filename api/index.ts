import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();
var jwt = require('jsonwebtoken');
const secret = 'Fullstack-Login-2021'
import multer from "multer";



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


router.post("/login", (req, res) => { //กำหนดเส้นทางสำหรับการ request ไปที่/login ซึ่งจะเรียกใช้ฟังก์ชันที่รับ request และ response เป็นพารามิเตอร์.
  const { email, password } = req.body; //การนำข้อมูลที่ส่งมาใน req.body มาเก็บไว้ใน ตัวแปล email and password

  // ตรวจสอบว่ามีอีเมลและรหัสผ่าน ในการrequest มาหรือไม่
  if (email && password) { //ถ้ามี email และ password
    conn.query( //จะทำการ ร้องขอจากฐานข้อมูลเพื่อตรวจจสอบว่ามี email และ password ที่ตรงกับที่ระบุมาหรือไม่
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
        //ถ้ามีผู้ใช้ที่ตรงกันจะทำการสร้าง json web token ด้วยข้อมูล email 
        var token = jwt.sign({ email: result[0].email }, secret, { expiresIn: '1h' });
        res.json({ result: true, data: { token } });
      }
    );
  } else {
    res.json({ result: false, message: "Email   and password are required" });
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

router.get("/bigbike/:uid_fk", (req, res) => {
  const uid_fk = req.params.uid_fk;
  try {
    const sql = 'SELECT * FROM bigbike WHERE uid_fk = ?';
    conn.query(sql, [uid_fk], (err, result) => {
      if (err) {
        console.error('Error:', err);
        res.status(500).json({ status: "error", message: "Internal Server Error" });
        return;
      }
      if (result.length === 0) {
        res.status(404).json({ status: "error", message: "User not found" });
        return;
      }
      res.json(result); // ส่งข้อมูล bigbike ทั้งหมดที่ตรงเงื่อนไขกลับไปยัง client
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(401).json({ status: "error", message: "Unauthorized" }); // ส่งข้อความ Unauthorized หาก token ไม่ถูกต้อง
  }
});


router.put("/update/:uid", (req, res) => {
  const uid = +req.params.uid; // รับค่า uid จากพารามิเตอร์ URL
  const { username, email, password, img, accountname } = req.body; // รับข้อมูลที่ต้องการอัพเดทจาก req.body

  // สร้างคำสั่ง SQL สำหรับการอัพเดทข้อมูล
  const sql = `
    UPDATE users 
    SET username = ?, email = ?, password = ?, img = ?, accountname = ? 
    WHERE uid = ?
  `;
  const values = [username, email, password, img, accountname, uid]; // กำหนดค่าที่จะใส่ลงไปในคำสั่ง SQL

  conn.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating user data:", err);
      res.status(500).json({ error: "Error updating user data" });
      return;
    }

    // ตรวจสอบว่ามีข้อมูลที่ถูกอัพเดทหรือไม่
    if (result.affectedRows === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Successfully updated user data",
      updated_user_id: uid
    });
  });
});


//อัพโหลดรูปลง firebase
//1.connect firebase
import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCq4wYB-AMtsn9HlrwPinI-1V8jLR9PQ-U",
    authDomain: "project-facemash-deab0.firebaseapp.com",
    projectId: "project-facemash-deab0",
    storageBucket: "project-facemash-deab0.appspot.com",
    messagingSenderId: "763262573358",
    appId: "1:763262573358:web:96a117813b9a944fc0b8bf",
    measurementId: "G-7ZJNWYLV1G"
  };
initializeApp(firebaseConfig);
const storage = getStorage();

//เอาขึ้น Firebase
class FileMiddleware {
  // Attribute filename
  filename = "";

  // Attribute diskloader
  // Create object of diskLoader for saving file
  public readonly diskLoader = multer({
    // storage = save define folder(disk) to be saved
    storage: multer.memoryStorage(),
    //limit file size
    limits: {
      fileSize: 67108864, // 64 MByte
    },
  });
}

// POST /upload
const fileUpload = new FileMiddleware();
router.post("/upuser", fileUpload.diskLoader.single("file"), async (req, res) => {

  const filename = Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";

  // define saving filename on firebase storage
  const storageRef = ref(storage, "/images/" + filename);
  //define file detail

  const metadata = {
    contentType: req.file!.mimetype
  }

  //upload to firebase storage
  const snapshot = await uploadBytesResumable(
    storageRef,
    req.file!.buffer,
    metadata);

  //Return
  const url = await getDownloadURL(snapshot.ref);
  res.status(200).json({
    file: url
  });
});