import express from "express";
import { router as index } from "./api/index";
import bodyParser from "body-parser";
import cors from "cors";

export const app = express();

app.use(
    cors({
      origin: "*",
    })
  );
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.text()); 

app.use("/user", index);

