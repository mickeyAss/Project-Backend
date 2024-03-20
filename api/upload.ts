import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();
import path from "path";
import multer from "multer";


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
  try {
    const filename = Date.now() + "-" + Math.round(Math.random() * 10000) + ".png";

    // Define saving filename on Firebase storage
    const storageRef = ref(storage, "/images/" + filename);
    
    // Define file metadata
    const metadata = {
      contentType: req.file!.mimetype
    };

    // Upload to Firebase storage
    const snapshot = await uploadBytesResumable(storageRef, req.file!.buffer, metadata);

    // Get download URL
    const url = await getDownloadURL(snapshot.ref);

    // Insert URL into MySQL database
    conn.query("INSERT INTO bigbike (bimg) VALUES (?)", [url], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        res.status(500).json({ error: "Error inserting data" });
      } else {
        res.status(200).json({ url });
      }
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Error uploading image" });
  }
});

router.post("/insert", (req, res) => {
  const { bname, bimg, uid_fk } = req.body; // รับไอดีของรูปภาพและคะแนนจากข้อมูลที่ส่งมา

  conn.query(
    "INSERT INTO bigbike (bname,bimg,uid_fk) VALUES (?, ?, ?)",
    [bname,bimg,uid_fk],
    (err, result) => {
      if (err) {
        console.error("Error inserting vote:", err);
        res.status(500).json({ error: "Error inserting" });
      } else {
        console.log("Vote added successfully");
        res.status(200).json({ message: "Insert added successfully" });
      }
    }
  );
});

