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
  const {uid_fk, bid_fk, score , date } = req.body; // รับไอดีของรูปภาพและคะแนนจากข้อมูลที่ส่งมา

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

// POST route เพื่อรับคะแนนรวมและอัปเดตลงในฐานข้อมูล bigbike
router.put("/updatescore/:bid", (req, res) => {
  let bid = +req.params.bid;
  let scsum = req.body.scsum;

  // ตรวจสอบข้อมูลที่ได้รับ
  console.log("Received data:", bid, scsum);

  // อัปเดตคะแนนรวมลงในฐานข้อมูล bigbike
  conn.query("UPDATE bigbike SET scsum = ? WHERE bid = ?", [scsum,bid], (err, result) => {
    if (err) {
      console.error("Error updating total score:", err);
      res.status(500).json({ error: "Error updating total score" });
    } else {
      console.log("Total score updated successfully");
      res.status(200).json({ message: "Total score updated successfully" });
    }
  });
});

router.get("/calculate-score/:bid", (req, res) => {
  let bid = req.params.bid;

  // คำสั่ง SQL สำหรับคำนวณคะแนนรวมสำหรับแต่ละ bid
  const sql = "SELECT bid_fk, SUM(score) AS total_score FROM vote WHERE bid_fk = ? GROUP BY bid_fk";

  conn.query(sql, [bid], (err, result) => {
    if (err) {
      console.error("Error calculating total score:", err);
      res.status(500).json({ error: "Error calculating total score" });
    } else {
      // ตรวจสอบว่ามีผลลัพธ์หรือไม่
      if (result.length > 0) {
        // ส่งข้อมูลคะแนนรวมกลับไป
        res.status(200).json({ bid: bid, total_score: result[0].total_score });
      } else {
        // หากไม่มีผลลัพธ์ให้ส่งคะแนนรวมเป็น 0
        res.status(200).json({ bid: bid, total_score: 0 });
      }
    }
  });
});
