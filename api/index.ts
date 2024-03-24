import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();
var jwt = require("jsonwebtoken");
const secret = "Fullstack-Login-2021";
import multer from "multer";

router.get("/", (req, res) => {
  conn.query("SELECT * FROM `users` WHERE type != 'admin'", (err, result) => {
    if (err) {
      res.json({ error: err.message });
      return;
    }
    res.json(result);
  });
});

router.get("/biduser/:uid", (req, res) => {
  const uid = req.params.uid;

  // ค้นหาข้อมูลผู้ใช้ที่ไม่ใช่ admin โดยใช้ uid
  const sql = "SELECT * FROM `users` WHERE uid = ?";
  conn.query(sql, [uid], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (result.length === 0) {
      // หากไม่มีผู้ใช้ที่ไม่ใช่ admin ที่มี uid ที่ระบุ
      res.status(404).json({ message: "User not found" });
      return;
    }
    // ส่งข้อมูลผู้ใช้ที่ไม่ใช่ admin ที่มี uid ที่ระบุกลับไปยัง client
    res.json(result);
  });
});

router.get("/avatar", (req, res) => {
  conn.query("SELECT * FROM `avatar`", (err, result) => {
    res.json(result);
  });
});

router.get("/biguser/:bid", (req, res) => {
  const bid = req.params.bid;
  const sql = `
    SELECT bigbike.*, users.*
    FROM bigbike
    INNER JOIN users ON bigbike.uid_fk = users.uid
    WHERE bigbike.bid = ?`;
  conn.query(sql, [bid], (err, result) => {
    if (err) {
      console.error("Error fetching data from bigbike and users:", err);
      res.status(500).json({ error: "Error fetching data" });
    } else {
      res.json(result);
    }
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
        // เพิ่มตรวจสอบประเภทของผู้ใช้
        const userType = result[0].type; // สมมติว่าชนิดของผู้ใช้ถูกเก็บไว้ในฟิลด์ "type" ในฐานข้อมูล
        var token;
        if (userType === 'admin') {
          token = jwt.sign({ email: result[0].email, type: 'admin' }, secret, {
            expiresIn: "1h",
          });
        } else {
          token = jwt.sign({ email: result[0].email, type: 'user' }, secret, {
            expiresIn: "1h",
          });
        }
        res.json({ result: true, userType, data: { token } });
      }
    );
  } else {
    res.json({ result: false, message: "Email and password are required" });
  }
});

router.post("/authen", (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    var decoded = jwt.verify(token, secret);
    res.json({ status: "ok", decoded });
  } catch (err) {
    res.json({ status: "error" });
  }
});

router.get("/:token", (req, res) => {
  const token = req.params.token; // รับ token จากพารามิเตอร์ URL
  try {
    // ตรวจสอบ token ว่าถูกต้องหรือไม่
    var decoded = jwt.verify(token, secret);
    // หาผู้ใช้จากฐานข้อมูลโดยใช้อีเมลที่ถูกเข้ารหัสใน token
    conn.query(
      "SELECT * FROM `users` WHERE email = ?",
      [decoded.email],
      (err, result) => {
        if (err) {
          console.error("Error:", err);
          res
            .status(500)
            .json({ status: "error", message: "Internal Server Error" });
          return;
        }
        if (result.length === 0) {
          res.status(404).json({ status: "error", message: "User not found" });
          return;
        }
        res.json(result[0]); // ส่งข้อมูลผู้ใช้ที่พบกลับไป
      }
    );
  } catch (error) {
    console.error("Error:", error);
    res.status(401).json({ status: "error", message: "Unauthorized" }); // ส่งข้อความ Unauthorized หาก token ไม่ถูกต้อง
  }
});

router.get("/bigbike/:uid", (req, res) => {
  const uid_fk = req.params.uid;
  try {
    const sql = `SELECT bigbike.*, users.*, 
                CASE 
                    WHEN bigbike.rankingyester < bigbike.ranking THEN bigbike.ranking - bigbike.rankingyester
                    WHEN bigbike.rankingyester > bigbike.ranking THEN bigbike.rankingyester - bigbike.ranking
                    ELSE 0
                END AS rank_difference,
                CASE 
                    WHEN bigbike.rankingyester < bigbike.ranking THEN 'down' 
                    WHEN bigbike.rankingyester > bigbike.ranking THEN 'up' 
                    ELSE 'same' 
                END AS rank_change
                FROM bigbike
                INNER JOIN users ON bigbike.uid_fk = users.uid
                WHERE uid = ?`;
    conn.query(sql, [uid_fk], (err, result) => {
      if (err) {
        console.error("Error:", err);
        res
          .status(500)
          .json({ status: "error", message: "Internal Server Error" });
        return;
      }
      res.json(result); // ส่งข้อมูล bigbike ทั้งหมดที่ตรงเงื่อนไขกลับไปยัง client
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(401).json({ status: "error", message: "Unauthorized" }); // ส่งข้อความ Unauthorized หาก token ไม่ถูกต้อง
  }
});

router.put("/update/:uid", (req, res) => {
  const uid = +req.params.uid; // รับค่า uid จากพารามิเตอร์ URL
  const { username, img, accountname } = req.body; // รับข้อมูลที่ต้องการอัพเดทจาก req.body

  // สร้างคำสั่ง SQL สำหรับการอัพเดทข้อมูล
  let sql = `
    UPDATE users 
    SET `;
  const values = [];

  // ตรวจสอบและเพิ่มฟิลด์ที่มีการอัพเดตลงในคำสั่ง SQL
  if (username) {
    sql += "username = ?, ";
    values.push(username);
  }
  if (img) {
    sql += "img = ?, ";
    values.push(img);
  }
  if (accountname) {
    sql += "accountname = ?, ";
    values.push(accountname);
  }

  // ลบช่องว่างและเครื่องหมาย ',' ที่ไม่จำเป็นท้ายสตริงคำสั่ง SQL
  sql = sql.slice(0, -2);

  // เพิ่มเงื่อนไข WHERE เพื่อกำหนดให้แก้ไขเฉพาะข้อมูลของผู้ใช้นั้นเท่านั้น
  sql += " WHERE uid = ?";
  values.push(uid);

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
      updated_user_id: uid,
    });
  });
});

router.put("/updatesafety/:uid", (req, res) => {
  const uid = +req.params.uid; // รับค่า uid จากพารามิเตอร์ URL
  const { email, password } = req.body; // รับข้อมูลที่ต้องการอัพเดทจาก req.body

  // สร้างคำสั่ง SQL สำหรับการอัพเดทข้อมูล
  let sql = `
    UPDATE users 
    SET `;
  const values = [];

  // ตรวจสอบและเพิ่มฟิลด์ที่มีการอัพเดตลงในคำสั่ง SQL
  if (email) {
    sql += "email = ?, ";
    values.push(email);
  }
  if (password) {
    sql += "password = ?, ";
    values.push(password);
  }

  // ลบช่องว่างและเครื่องหมาย ',' ที่ไม่จำเป็นท้ายสตริงคำสั่ง SQL
  sql = sql.slice(0, -2);

  // เพิ่มเงื่อนไข WHERE เพื่อกำหนดให้แก้ไขเฉพาะข้อมูลของผู้ใช้นั้นเท่านั้น
  sql += " WHERE uid = ?";
  values.push(uid);

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
      updated_user_id: uid,
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
  measurementId: "G-7ZJNWYLV1G",
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
router.post(
  "/upuser",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    const filename =
      Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";

    // define saving filename on firebase storage
    const storageRef = ref(storage, "/images/" + filename);
    //define file detail

    const metadata = {
      contentType: req.file!.mimetype,
    };

    //upload to firebase storage
    const snapshot = await uploadBytesResumable(
      storageRef,
      req.file!.buffer,
      metadata
    );

    //Return
    const url = await getDownloadURL(snapshot.ref);
    res.status(200).json({
      file: url,
    });
  }
);
