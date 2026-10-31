import  express  from "express";
import { getThumbnailbyId, getUserThumbnail } from "../controllers/UserController.js";

const UserRouter = express.Router();

UserRouter.get('/thumbnails', getUserThumbnail)
UserRouter.get('/thumbnail/:id', getThumbnailbyId)

export default UserRouter;