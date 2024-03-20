import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();

// POST route เพื่อรับคะแนนที่โหวตและเพิ่มข้อมูลลงในฐานข้อมูล
router.post("/vote", (req, res) => {
  const { uid_fk, bid_fk, score, date } = req.body; // รับไอดีของรูปภาพและคะแนนจากข้อมูลที่ส่งมา

  // ตรวจสอบข้อมูลที่ได้รับ
  console.log("Received data:", uid_fk, bid_fk, score, date);

  // เพิ่มข้อมูล vote ลงในฐานข้อมูลพร้อมเวลาและวันที่
  conn.query(
    "INSERT INTO vote (uid_fk ,bid_fk, score, date) VALUES (?, ?, ?, ?)",
    [uid_fk, bid_fk, score, date],
    (err, result) => {
      if (err) {
        console.error("Error inserting vote:", err);
        res.status(500).json({ error: "Error inserting vote" });
      } else {
        console.log("Vote added successfully");
        res.status(200).json({ message: "Vote added successfully" });
      }
    }
  );
});


router.get("/votesome", (req, res) => {
  const sql =
    "SELECT bigbike.*, SUM(COALESCE(vote.score, 0)) AS total_score FROM bigbike LEFT JOIN vote ON bigbike.bid = vote.bid_fk GROUP BY bigbike.bid";
  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
});



router.get("/votesome/:bid", (req, res) => {
  const { bid } = req.params;
  const sql = `
      SELECT bigbike.*, vote.*, COALESCE(vote.score, 0) AS current_score 
      FROM bigbike 
      LEFT JOIN vote ON bigbike.bid = vote.bid_fk 
      WHERE vote.bid_fk = ? AND vote.score != 0
      ORDER BY vote.date DESC
      LIMIT 1`;
  conn.query(sql, [bid], (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
});

router.get("/topten", (req, res) => {
  const sql = `
    SELECT bigbike.*, 
           vote.uid_fk, 
           vote.score, 
           vote.date,
           COALESCE(vote.score, 0) AS current_score 
    FROM bigbike 
    LEFT JOIN (
      SELECT vote.*
      FROM vote
      JOIN (
         SELECT bid_fk, MAX(date) AS max_date
         FROM vote
         WHERE score != 0
         GROUP BY bid_fk
      ) AS latest_votes ON vote.bid_fk = latest_votes.bid_fk AND vote.date = latest_votes.max_date
    ) AS vote ON bigbike.bid = vote.bid_fk`;
  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
});


/// GET route เพื่อรับคะแนนรวมของบิดและแสดงคะแนนรวมของ 7 วันย้อนหลัง
router.get("/totalScore/:bid", (req, res) => {
  const { bid } = req.params;
  // คำสั่ง SQL เพื่อหาคะแนนรวมของบิดและคะแนนรวมของ 7 วันย้อนหลัง
  const sql = `
    SELECT 
      bid_fk,
      SUM(score) AS total_score,
      DATE(date) AS vote_date
    FROM 
      vote
    WHERE 
      bid_fk = ? AND
      DATE(date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND
      DATE(date) <= CURDATE()
    GROUP BY 
      bid_fk, DATE(date)
    ORDER BY 
      vote_date DESC`;

  conn.query(sql, [bid], (err, result) => {
    if (err) {
      console.error("Error fetching total score for bid:", bid, err);
      res.status(500).json({ error: "Error fetching total score" });
    } else {
      // ตรวจสอบว่ามีข้อมูลของ bid ที่ระบุหรือไม่
      if (result.length > 0) {
        // ส่งข้อมูลคะแนนรวมของบิดและคะแนนรวมของ 7 วันย้อนหลังกลับไป
        res.status(200).json(result);
      } else {
        // หากไม่พบข้อมูลของ bid ที่ระบุ
        res.status(404).json({ error: "Bid not found or no votes within the last 7 days" });
      }
    }
  });
});


//ดึงข้อมูลจากมากไปน้อยแค่10อันดับ
router.get("/", (req, res) => {
  conn.query("SELECT * FROM `bigbike` ORDER BY scsum DESC LIMIT 10", (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Error fetching data" });
    } else {
      res.json(result);
    }
  });
});


//ดึงข้อมูลของแต่ละ bid
router.get("/getBid/:bid", (req, res) => {
  let bid = req.params.bid;

  // คำสั่ง SQL สำหรับดึงข้อมูลของ bid ที่ระบุ
  const sql = "SELECT * FROM bigbike WHERE bid = ?";

  conn.query(sql, [bid], (err, result) => {
    if (err) {
      console.error("Error fetching data for bid:", bid, err);
      res.status(500).json({ error: "Error fetching data" });
    } else {
      // ตรวจสอบว่ามีข้อมูลของ bid ที่ระบุหรือไม่
      if (result.length > 0) {
        // ส่งข้อมูลของ bid ที่ระบุกลับไป
        res.status(200).json(result[0]);
      } else {
        // หากไม่พบข้อมูลของ bid ที่ระบุ
        res.status(404).json({ error: "Bid not found" });
      }
    }
  });
});

