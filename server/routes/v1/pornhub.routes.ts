import { Router } from "express";
import { pornhubController } from "../../controllers/pornhub.controller";
import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { Role } from "../../config/constants";

const router = Router();

// Public / Internal status check
router.get("/status", pornhubController.getStatus);

// Public Unblocked ISP Proxy Relay Route (Bypasses ERR_CONNECTION_RESET)
router.get("/embed/:videoId", pornhubController.embedProxy);

// Admin-only search & bulk import
router.get(
  "/search",
  authenticateToken,
  requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN),
  pornhubController.search
);

router.post(
  "/import",
  authenticateToken,
  requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN),
  pornhubController.importBatch
);

export default router;
