import "./loadBackendEnv.js";
import { loadConfig } from "../src/config.js";
import {
  setupDatabase,
  User,
  UserMessage,
  UserNotification,
} from "../src/models/index.js";

const email = (process.env.SEED_INBOX_USER_EMAIL ?? "admin@gmail.com").trim();

const NOTIFICATIONS: { title: string; body: string; unread: boolean; ageMs: number }[] = [];

const MESSAGES: { title: string; body: string; unread: boolean; ageMs: number }[] = [];

async function main() {
  const config = loadConfig();
  const sequelize = setupDatabase(config);
  await sequelize.authenticate();

  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}. Run npm run seed:admin first.`);
    process.exit(1);
  }

  const userId = user.id;
  const now = Date.now();

  await UserNotification.destroy({ where: { userId } });
  await UserMessage.destroy({ where: { recipientUserId: userId } });

  for (const n of NOTIFICATIONS) {
    const createdAt = new Date(now - n.ageMs);
    await UserNotification.create({
      userId,
      title: n.title,
      body: n.body,
      readAt: n.unread ? null : new Date(now - n.ageMs + 60_000),
      createdAt,
    });
  }

  for (const m of MESSAGES) {
    const createdAt = new Date(now - m.ageMs);
    await UserMessage.create({
      recipientUserId: userId,
      senderUserId: null,
      title: m.title,
      body: m.body,
      readAt: m.unread ? null : new Date(now - m.ageMs + 60_000),
      createdAt,
    });
  }

  console.log(
    `Seeded ${NOTIFICATIONS.length} notifications and ${MESSAGES.length} messages for ${email} (user id ${userId}).`,
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
