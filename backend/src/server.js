import app from "./app.js";
import { connectDB } from "./db.js";

const port = process.env.PORT || 4000;

await connectDB();
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
