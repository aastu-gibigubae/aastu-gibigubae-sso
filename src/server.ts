import app from "./app.js";
import { envConfig } from "./config/config.js";
console.log("DB URL:", process.env.DATABASE_URL);
app.listen(parseInt(envConfig.PORT),()=>{
    console.log(`Server listening on http://localhost:${parseInt(envConfig.PORT)}`)
})