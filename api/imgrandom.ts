import express from "express";
import { conn } from "../dbconnect";
export const router = express.Router();

router.get("/getBB/:bid", (req, res) => {
  const bid = req.params.bid;
  conn.query("SELECT * FROM `bigbike` WHERE bid = ?", [bid], (err, result) => {
    if (err) {
      console.error("Error retrieving BigBike data:", err);
      res.status(500).json({ error: "Error retrieving BigBike data" });
      return;
    }
    res.json(result);
  });
});

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
  const sql = `
    SELECT bigbike.*, users.*, SUM(COALESCE(vote.score, 0)) AS total_score
    FROM bigbike
    LEFT JOIN vote ON bigbike.bid = vote.bid_fk
    LEFT JOIN users ON bigbike.uid_fk = users.uid
    GROUP BY bigbike.bid`;
  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
});

// router.get("/votesomee", (req, res) => {

//   const sql = `
//     SELECT bigbike.*, users.*, SUM(COALESCE(vote.score, 0)) AS total_score
//     FROM bigbike
//     LEFT JOIN vote ON bigbike.bid = vote.bid_fk
//     LEFT JOIN users ON bigbike.uid_fk = users.uid
//     GROUP BY bigbike.bid
//     ORDER BY total_score DESC`; // เรียงลำดับจากมากไปน้อยตาม total_score
//   conn.query(sql, (err, result) => {
//     if (err) {
//       res.json(err);
//     } else {
//       let rank = 1; // เริ่มต้นที่อันดับ 1
//       result.forEach((item: any, index: number) => {
//         if (index > 0 && result[index].total_score === result[index - 1].total_score) {
//           // ถ้าคะแนนเท่ากันกับรายการก่อนหน้า ให้ใช้อันดับเดียวกัน
//           result[index].rank = result[index - 1].rank;
//         } else {
//           result[index].rank = rank++; // เพิ่มอันดับเรื่อยๆ
//         }
//       });
//       res.json(result);
//     }
//   });
// });

router.get("/votesomee", (req, res) => {
  const sql = `
    SELECT bigbike.*, users.*, SUM(COALESCE(vote.score, 0)) AS total_score
    FROM bigbike
    LEFT JOIN vote ON bigbike.bid = vote.bid_fk
    LEFT JOIN users ON bigbike.uid_fk = users.uid
    GROUP BY bigbike.bid
    ORDER BY total_score DESC`;

  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      let rank = 1;
      result.forEach((item: any, index: number) => {
        if (
          index > 0 &&
          result[index].total_score === result[index - 1].total_score
        ) {
          result[index].ranking = result[index - 1].ranking;
        } else {
          result[index].ranking = rank++;
        }
        const updateRankSQL = `UPDATE bigbike SET ranking = ${result[index].ranking} WHERE bid = ${result[index].bid}`;
        conn.query(updateRankSQL, (updateErr, updateResult) => {
          if (updateErr) {
            console.error(
              "Error updating ranking for bid",
              result[index].bid,
              updateErr
            );
            res
              .status(500)
              .json({ error: "Failed to update ranking for some bids" });
          }
        });
      });
      res.json(result);
    }
  });
});

router.get("/yesterday", (req, res) => {
  const sql = `
    SELECT bigbike.*, users.*, SUM(COALESCE(vote.score, 0)) AS total_score
    FROM bigbike
    LEFT JOIN vote ON bigbike.bid = vote.bid_fk
    LEFT JOIN users ON bigbike.uid_fk = users.uid
    WHERE DATE(vote.date) < CURDATE()  
    GROUP BY bigbike.bid
    ORDER BY total_score DESC`;

  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      let rank = 1;
      result.forEach((item: any, index: number) => {
        if (
          index > 0 &&
          result[index].total_score === result[index - 1].total_score
        ) {
          result[index].ranking = result[index - 1].ranking;
        } else {
          result[index].ranking = rank++;
        }
        const updateRankSQL = `UPDATE bigbike SET rankingyester = ${result[index].ranking} WHERE bid = ${result[index].bid}`;
        conn.query(updateRankSQL, (updateErr, updateResult) => {
          if (updateErr) {
            console.error(
              "Error updating ranking for bid",
              result[index].bid,
              updateErr
            );
            res
              .status(500)
              .json({ error: "Failed to update ranking for some bids" });
          }
        });
      });
      res.json(result);
    }
  });
});

router.get("/topten", (req, res) => {
  const sql = `
    SELECT bigbike.*, users.*, SUM(COALESCE(vote.score, 0)) AS total_score
    FROM bigbike
    LEFT JOIN vote ON bigbike.bid = vote.bid_fk
    LEFT JOIN users ON bigbike.uid_fk = users.uid
    GROUP BY bigbike.bid
    ORDER BY total_score DESC 
    LIMIT 10`;

  conn.query(sql, (err, result) => {
    if (err) {
      res.json(err);
    } else {
      let rank = 1;
      result.forEach((item: any, index: number) => {
        if (
          index > 0 &&
          result[index].total_score === result[index - 1].total_score
        ) {
          result[index].ranking = result[index - 1].ranking;
        } else {
          result[index].ranking = rank++;
        }

        // Calculate rank_difference
        result[index].rank_difference =
          result[index].rankingyester < result[index].ranking
            ? result[index].ranking - result[index].rankingyester
            : result[index].rankingyester - result[index].ranking;

        // Determine rank_change
        result[index].rank_change =
          result[index].rankingyester < result[index].ranking
            ? "ลดลงจากเมื่อวาน"
            : result[index].rankingyester > result[index].ranking
            ? "เพิ่มขึ้นจากเมื่อวาน"
            : "same";
      });

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
  const sql = ` SELECT bigbike.bid, DATE_FORMAT(vote.date, '%d') AS vote_date, 
  CASE
      WHEN DATE(vote.date) = (SELECT MIN(DATE(v2.date)) FROM vote v2 WHERE v2.bid_fk = bigbike.bid) THEN SUM(COALESCE(vote.score, 0))
      ELSE SUM(COALESCE(vote.score, 0)) + 
           (SELECT SUM(COALESCE(v2.score, 0)) 
            FROM vote v2 
            WHERE bigbike.bid = v2.bid_fk AND DATE(v2.date) < DATE(vote.date))
  END AS total_score
  FROM bigbike 
  LEFT JOIN vote ON bigbike.bid = vote.bid_fk
  WHERE bigbike.bid = ?
  GROUP BY bigbike.bid, DATE(vote.date), vote.date
  ORDER BY DATE(vote.date) ASC`;

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
        res
          .status(404)
          .json({ error: "Bid not found or no votes within the last 7 days" });
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
  conn.query(
    "UPDATE bigbike SET `scsum` = ? WHERE `bid` = ?",
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
