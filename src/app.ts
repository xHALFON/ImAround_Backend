import app from './index';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT;

app.listen(PORT, () => {
   console.log(`Server is running on port ${PORT}`); //PORT 3000
});