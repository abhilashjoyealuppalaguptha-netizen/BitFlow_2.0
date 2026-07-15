import { readFileSync } from "node:fs";

const payload = JSON.parse(readFileSync("tmp/last_sim_response.json", "utf8"));
const text = Buffer.from(payload.waveform.vcd_base64, "base64").toString("utf8");
console.log(text);
