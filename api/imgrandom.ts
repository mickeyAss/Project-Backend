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
    "SELECT bigbike.*,vote.*, COALESCE(vote.score ,0) AS score FROM bigbike LEFT JOIN vote ON bigbike.bid = vote.bid_fk";
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

// POST route เพื่อรับคะแนนรวมและอัปเดตลงในฐานข้อมูล bigbike
router.put("/updatescore/:bid", (req, res) => {
  let bid = +req.params.bid;
  let scsum = req.body.scsum;

  // ตรวจสอบข้อมูลที่ได้รับ
  console.log("Received data:", bid, scsum);

  // อัปเดตคะแนนรวมลงในฐานข้อมูล bigbike
  conn.query(
    "UPDATE bigbike SET scsum = ? WHERE bid = ?",
    [scsum, bid],
    (err, result) => {
      if (err) {
        console.error("Error updating total score:", err);
        res.status(500).json({ error: "Error updating total score" });
      } else {
        console.log("Total score updated successfully");
        res.status(200).json({ message: "Total score updated successfully" });
      }
    }
  );
});

//คำนวณคะแนนรวม
// router.get("/calculate-score/:bid", (req, res) => {
//   let bid = req.params.bid;

//   // คำสั่ง SQL สำหรับคำนวณคะแนนรวมสำหรับแต่ละ bid
//   const sql = "SELECT bid_fk, SUM(score) AS total_score FROM vote WHERE bid_fk = ? GROUP BY bid_fk";

//   conn.query(sql, [bid], (err, result) => {
//     if (err) {
//       console.error("Error calculating total score:", err);
//       res.status(500).json({ error: "Error calculating total score" });
//     } else {
//       // ตรวจสอบว่ามีผลลัพธ์หรือไม่
//       if (result.length > 0) {
//         // ส่งข้อมูลคะแนนรวมกลับไป
//         res.status(200).json({ bid: bid, total_score: result[0].total_score });
//       } else {
//         // หากไม่มีผลลัพธ์ให้ส่งคะแนนรวมเป็น 0
//         res.status(200).json({ bid: bid, total_score: 0 });
//       }
//     }
//   });
// });

//ดึงข้อมูลจากมากไปน้อยแค่10อันดับ
router.get("/", (req, res) => {
  conn.query(
    "SELECT * FROM `bigbike` ORDER BY scsum DESC LIMIT 10",
    (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: "Error fetching data" });
      } else {
        res.json(result);
      }
    }
  );
});

// router.get("/beforeDay", (req, res) => {
//   const today = new Date();
//   const sql = `
//     SELECT bigbike.*,
//            SUM(CASE WHEN DATE(vote.date) != CURDATE() THEN COALESCE(vote.score, 0) ELSE 0 END) AS total_score
//     FROM bigbike
//     LEFT JOIN vote ON bigbike.bid = vote.bid_fk
//     GROUP BY bigbike.bid
//     ORDER BY total_score DESC
//     LIMIT 10
//   `;
//   conn.query(sql, (err, result) => {
//     if (err) {
//       console.error("Error fetching data:", err);
//       res.status(500).json({ error: "Error fetching data" });
//     } else {
//       res.json(result);
//     }
//   });
// });

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

router.get("/scores-last-7-days/:bid", (req, res) => {
  const bid = req.params.bid;

  // คำสั่ง SQL สำหรับค้นหาคะแนนล่าสุดของแต่ละวันสำหรับแต่ละ bid ในช่วง 7 วันย้อนหลัง
  const sql = `
    SELECT vote.bid_fk,
           DATE(vote.date) AS voting_day,
           COALESCE(score, 0) AS latest_score
    FROM vote
    WHERE vote.bid_fk = ?
      AND DATE(vote.date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
    ORDER BY DATE(vote.date) ASC
  `;

  conn.query(sql, [bid], (err, result) => {
    if (err) {
      console.error("Error fetching scores for last 7 days:", err);
      res.status(500).json({ error: "Error fetching scores for last 7 days" });
    } else {
      res.status(200).json(result);
    }
  });
});
