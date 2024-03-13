import express from "express";
import { router as index } from "./api/index";
import { router as upload } from "./api/upload"
import { router as imgrandom } from "./api/imgrandom";
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
app.use("/imgrandom", imgrandom);
app.use("/upload",upload);

