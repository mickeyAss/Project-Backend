import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();

router.get("/", (req, res) => {
    conn.query("SELECT * FROM `bigbike`", (err, result) => {
      res.json(result);
    });
  });

// POST route เพื่อรับคะแนนที่โหวตและเพิ่มข้อมูลลงในฐานข้อมูล
router.post("/vote", (req, res) => {
  const {uid_fk, bid_fk, score, date } = req.body; // รับไอดีของรูปภาพและคะแนนจากข้อมูลที่ส่งมา

  // ตรวจสอบข้อมูลที่ได้รับ
  console.log("Received data:",uid_fk, bid_fk, score, date);

  // เพิ่มข้อมูล vote ลงในฐานข้อมูลพร้อมเวลาและวันที่
  conn.query("INSERT INTO vote (uid_fk ,bid_fk, score, date) VALUES (?, ?, ?, ?)", [uid_fk, bid_fk, score, date], (err, result) => {
    if (err) {
      console.error("Error inserting vote:", err);
      res.status(500).json({ error: "Error inserting vote" });
    } else {
      console.log("Vote added successfully");
      res.status(200).json({ message: "Vote added successfully" });
    }
  });
});

router.get("/votesome",(req,res)=>{
    const sql = "SELECT bigbike.*,vote.*, COALESCE(vote.score ,0) AS score FROM bigbike LEFT JOIN vote ON bigbike.bid = vote.bid_fk"; 
    conn.query(sql,(err,result)=>{
        if(err){
            res.json(err);  
        }else{
            res.json(result)
        }
    })
});