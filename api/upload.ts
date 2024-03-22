import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();
import path from "path";
import multer from "multer";


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
router.post("/", fileUpload.diskLoader.single("file"), async (req, res) => {

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

router.post("/insert", (req, res) => {
  const { bname, bimg, uid_fk } = req.body; // รับชื่อรูป, ลิงก์รูป, และ uid จากข้อมูลที่ส่งมา

  // ตรวจสอบว่ามีรูปภาพของ UID นี้อยู่เกิน 5 รูปหรือไม่
  conn.query("SELECT COUNT(*) AS image_count FROM bigbike WHERE uid_fk = ?", [uid_fk], (err, result) => {
    if (err) {
      console.error("Error checking image count:", err);
      res.status(500).json({ error: "Error checking image count" });
      return;
    }

    const imageCount = result[0].image_count;
    if (imageCount >= 5) {
      // ถ้ามีรูปภาพเต็ม 5 รูปแล้ว ส่งข้อความแจ้งเตือนกลับไปยังผู้ใช้
      res.status(400).json({ error: "Maximum image count reached for this user" });
    } else {
      // ถ้ายังไม่เต็ม 5 รูป ดำเนินการเพิ่มรูปภาพเข้าสู่ฐานข้อมูล
      conn.query(
        "INSERT INTO bigbike (bname, bimg, uid_fk) VALUES (?, ?, ?)",
        [bname, bimg, uid_fk],
        (err, result) => {
          if (err) {
            console.error("Error inserting image:", err);
            res.status(500).json({ error: "Error inserting image" });
          } else {
            console.log("Image added successfully");
            res.status(200).json({ message: "Image added successfully" });
          }
        }
      );
    }
  });
});

router.get("/image-count/:uid", (req, res) => {
  const uid = req.params.uid;

  // ตรวจสอบจำนวนรูปภาพของ UID นี้
  conn.query("SELECT COUNT(*) AS image_count FROM bigbike WHERE uid_fk = ?", [uid], (err, result) => {
    if (err) {
      console.error("Error checking image count:", err);
      res.status(500).json({ error: "Error checking image count" });
    } else {
      const imageCount = result[0].image_count;
      console.log('Image count:', imageCount);
      res.status(200).json({ image_count: imageCount });
    }
  });
});

router.delete("/deleteimg/:bid", (req, res) => {
  const bid = +req.params.bid;

  // ลบข้อมูลในตาราง vote ที่มี bid_fk เท่ากับ bid ที่ระบุ
  conn.query("DELETE FROM vote WHERE bid_fk = ?", [bid], (err, voteResult) => {
    if (err) {
      console.error("Error deleting from vote table:", err);
      res.status(500).json({ error: "Error deleting from vote table" });
      return;
    }

    // ลบข้อมูลในตาราง bigbike ที่มี bid ที่ระบุ
    conn.query("DELETE FROM bigbike WHERE bid = ?", [bid], (err, bigbikeResult) => {
      if (err) {
        console.error("Error deleting from bigbike table:", err);
        res.status(500).json({ error: "Error deleting from bigbike table" });
        return;
      }

      res.status(200).json({
        message: "Successfully deleted from bigbike and vote tables",
        bigbike_affected_rows: bigbikeResult.affectedRows,
        vote_affected_rows: voteResult.affectedRows
      });
    });
  });
});



