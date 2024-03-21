import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();


// insert คะแนนที่เพิ่ม-ลดของแต่ละ bid ลง table vote
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

// แสดงข้อมูลรถใน table bigbike และคะแนนในtable vote
router.get("/votesome", (req, res) => {
  const sql =
    "SELECT bigbike.*, SUM(COALESCE(vote.score, 100)) AS total_score FROM bigbike LEFT JOIN vote ON bigbike.bid = vote.bid_fk GROUP BY bigbike.bid";
  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
});

//แสดงข้อมูลรถใน table bigbike และคะแนนในtable vote ของแต่ละ bid
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

//แสดงคะแนนรวม 7 วันย้อนหลัง
router.get("/totalScore/:bid", (req, res) => {
  const { bid } = req.params;
  // คำสั่ง SQL เพื่อหาคะแนนรวมของบิดและคะแนนรวมของ 7 วันย้อนหลัง
  const sql = `
    SELECT 
      bigbike.bid AS bid_fk,
      DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.seq DAY), '%d') AS vote_date,
      COALESCE(SUM(vote.score), 0) AS total_score
    FROM 
      (SELECT 0 AS seq
      UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
      UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS seq
    LEFT JOIN 
      bigbike ON bigbike.bid = ?
    LEFT JOIN 
      vote ON bigbike.bid = vote.bid_fk AND DATE(vote.date) = DATE_SUB(CURDATE(), INTERVAL seq.seq DAY)
    WHERE 
      bigbike.bid = ?
    GROUP BY 
      bigbike.bid, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.seq DAY), '%d'), seq.seq
    ORDER BY 
      DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq.seq DAY), '%d') ASC`;

  conn.query(sql, [bid, bid], (err, result) => {
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

