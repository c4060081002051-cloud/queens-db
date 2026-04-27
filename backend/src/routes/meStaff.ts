import { Router } from "express";
import { StaffMember } from "../models/index.js";

function trimStr(input: unknown, maxLen: number): string | null {
  if (typeof input !== "string") return null;
  const t = input.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function mapStaffRow(row: StaffMember) {
  return {
    id: row.id,
    userId: row.userId,
    staffType: row.staffType,
    displayName: row.displayName,
    email: row.email,
    staffRole: row.staffRole,
    phone: row.phone,
    address: row.address,
    gender: row.gender,
    dateOfBirth: row.dateOfBirth,
    nationality: row.nationality,
    maritalStatus: row.maritalStatus,
    nationalId: row.nationalId,
    qualification: row.qualification,
    languages: row.languages,
    dateOfJoining: row.dateOfJoining,
    experience: row.experience,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    refereeName: row.refereeName,
    refereeContact: row.refereeContact,
    staffPhotoUrl: row.staffPhotoUrl,
    staffPhotoName: row.staffPhotoName,
    assignedClass: row.assignedClass,
    teachingSection: row.teachingSection,
    staffCategory: row.staffCategory,
    nationalIdPhotoUrl: row.nationalIdPhotoUrl,
    nationalIdPhotoName: row.nationalIdPhotoName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createMeStaffRouter() {
  const r = Router();

  r.get("/staff-members", async (req, res) => {
    try {
      const type = trimStr(req.query.type, 20);
      const where = type ? { staffType: type } : undefined;
      const rows = await StaffMember.findAll({
        where,
        order: [
          ["staffType", "ASC"],
          ["displayName", "ASC"],
        ],
      });
      return res.json({ items: rows.map(mapStaffRow) });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.post("/staff-members", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const displayName = trimStr(body.displayName, 120);
      const staffRole = trimStr(body.staffRole, 80);
      const staffType = trimStr(body.staffType, 20) ?? "teaching";
      if (!displayName) return res.status(400).json({ error: "Display name is required" });
      if (!staffRole) return res.status(400).json({ error: "Staff role is required" });

      const item = await StaffMember.create({
        userId: null,
        staffType,
        displayName,
        email: trimStr(body.email, 255),
        staffRole,
        phone: trimStr(body.phone, 32),
        address: trimStr(body.address, 255),
        gender: trimStr(body.gender, 20),
        dateOfBirth: trimStr(body.dateOfBirth, 20),
        nationality: trimStr(body.nationality, 100),
        maritalStatus: trimStr(body.maritalStatus, 40),
        nationalId: trimStr(body.nationalId, 60),
        qualification: trimStr(body.qualification, 120),
        languages: trimStr(body.languages, 255),
        dateOfJoining: trimStr(body.dateOfJoining, 20),
        experience: trimStr(body.experience, 5000),
        emergencyContactName: trimStr(body.emergencyContactName, 120),
        emergencyContactPhone: trimStr(body.emergencyContactPhone, 32),
        refereeName: trimStr(body.refereeName, 120),
        refereeContact: trimStr(body.refereeContact, 120),
        staffPhotoUrl: trimStr(body.staffPhotoUrl, 255),
        staffPhotoName: trimStr(body.staffPhotoName, 255),
        assignedClass: trimStr(body.assignedClass, 80),
        teachingSection: trimStr(body.teachingSection, 32),
        staffCategory: trimStr(body.staffCategory, 32),
        nationalIdPhotoUrl: trimStr(body.nationalIdPhotoUrl, 255),
        nationalIdPhotoName: trimStr(body.nationalIdPhotoName, 255),
      });

      return res.status(201).json({ item: mapStaffRow(item) });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.patch("/staff-members/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await StaffMember.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });

      const body = req.body as Record<string, unknown>;
      const next: Record<string, string | null> = {};

      const assign = (key: string, maxLen: number) => {
        if (!Object.prototype.hasOwnProperty.call(body, key)) return;
        next[key] = trimStr(body[key], maxLen);
      };
      assign("staffType", 20);
      assign("displayName", 120);
      assign("email", 255);
      assign("staffRole", 80);
      assign("phone", 32);
      assign("address", 255);
      assign("gender", 20);
      assign("dateOfBirth", 20);
      assign("nationality", 100);
      assign("maritalStatus", 40);
      assign("nationalId", 60);
      assign("qualification", 120);
      assign("languages", 255);
      assign("dateOfJoining", 20);
      assign("experience", 5000);
      assign("emergencyContactName", 120);
      assign("emergencyContactPhone", 32);
      assign("refereeName", 120);
      assign("refereeContact", 120);
      assign("staffPhotoUrl", 255);
      assign("staffPhotoName", 255);
      assign("assignedClass", 80);
      assign("teachingSection", 32);
      assign("staffCategory", 32);
      assign("nationalIdPhotoUrl", 255);
      assign("nationalIdPhotoName", 255);

      if (Object.prototype.hasOwnProperty.call(next, "displayName") && !next.displayName) {
        return res.status(400).json({ error: "Display name is required" });
      }
      if (Object.prototype.hasOwnProperty.call(next, "staffRole") && !next.staffRole) {
        return res.status(400).json({ error: "Staff role is required" });
      }

      await row.update(next);

      return res.json({ item: mapStaffRow(row) });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  r.delete("/staff-members/:id", async (req, res) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: "Invalid id" });
      const row = await StaffMember.findByPk(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await row.destroy();
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Database unavailable" });
    }
  });

  return r;
}

