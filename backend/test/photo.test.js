import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  ALLOWED_FORMATS,
  cloudinaryConfig,
  createUploadTicket,
  isPlayerPhotoUrl,
  signParams,
} from "../src/services/cloudinary.js";
import { playerJSON, profileJSON } from "../src/utils/toJSON.js";
import { computeStats } from "../src/services/stats.js";

const ID = "a".repeat(24);
const OTHER = "b".repeat(24);

test("signature matches the example in Cloudinary's own documentation", () => {
  const sig = signParams(
    { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" },
    "abcd"
  );
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("signing ignores empty values and sorts by name", () => {
  const a = signParams({ b: "2", a: "1", skip: "" , gone: undefined }, "s");
  const b = crypto.createHash("sha1").update("a=1&b=2" + "s").digest("hex");
  assert.equal(a, b);
});

test("upload ticket: fixed public id per player, signature covers the right fields", () => {
  const cfg = { cloudName: "demo-cloud", apiKey: "123", apiSecret: "topsecret" };
  const t = createUploadTicket(ID, cfg, 1700000000123);
  assert.equal(t.timestamp, 1700000000);
  assert.equal(t.publicId, `academy-desk/players/${ID}`);
  assert.equal(t.uploadUrl, "https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
  assert.equal(t.apiKey, "123");
  const expected = crypto
    .createHash("sha1")
    .update(
      `allowed_formats=${ALLOWED_FORMATS}&invalidate=true&overwrite=true&public_id=academy-desk/players/${ID}&timestamp=1700000000topsecret`
    )
    .digest("hex");
  assert.equal(t.signature, expected);
  assert.ok(!JSON.stringify(t).includes("topsecret"), "the API secret must never be in the ticket");
});

test("cloudinaryConfig is null unless all three values are set", () => {
  assert.equal(cloudinaryConfig({}), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "y" }), null);
  assert.deepEqual(
    cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: " x ", CLOUDINARY_API_KEY: "y", CLOUDINARY_API_SECRET: "z" }),
    { cloudName: "x", apiKey: "y", apiSecret: "z" }
  );
});

test("photoUrl: accepts only this player's own photo in our own cloud", () => {
  const base = "https://res.cloudinary.com/demo-cloud/image/upload";
  assert.equal(isPlayerPhotoUrl(`${base}/v1700000000/academy-desk/players/${ID}.jpg`, ID, "demo-cloud"), true);
  assert.equal(isPlayerPhotoUrl(`${base}/academy-desk/players/${ID}.png`, ID, "demo-cloud"), true);
  assert.equal(isPlayerPhotoUrl(`${base}/v1/academy-desk/players/${ID}`, ID, "demo-cloud"), true);

  assert.equal(isPlayerPhotoUrl(`${base}/v1/academy-desk/players/${OTHER}.jpg`, ID, "demo-cloud"), false, "someone else's photo");
  assert.equal(isPlayerPhotoUrl(`https://res.cloudinary.com/evil-cloud/image/upload/v1/academy-desk/players/${ID}.jpg`, ID, "demo-cloud"), false, "another account");
  assert.equal(isPlayerPhotoUrl(`http://res.cloudinary.com/demo-cloud/image/upload/v1/academy-desk/players/${ID}.jpg`, ID, "demo-cloud"), false, "not https");
  assert.equal(isPlayerPhotoUrl(`${base}/v1/academy-desk/players/${ID}.jpg?x=1`, ID, "demo-cloud"), false, "query string");
  assert.equal(isPlayerPhotoUrl(`${base}/v1/academy-desk/players/${ID}.gif`, ID, "demo-cloud"), false, "format not allowed");
  assert.equal(isPlayerPhotoUrl(`${base}/v1/other/${ID}.jpg`, ID, "demo-cloud"), false, "wrong folder");
  assert.equal(isPlayerPhotoUrl("https://example.com/me.jpg", ID, "demo-cloud"), false);
  assert.equal(isPlayerPhotoUrl(null, ID, "demo-cloud"), false);
  assert.equal(isPlayerPhotoUrl(`${base}/v1/academy-desk/players/${ID}.jpg`, ID, ""), false);
  // a cloud name with regex characters must be matched literally
  assert.equal(isPlayerPhotoUrl(`https://res.cloudinary.com/dxyz/image/upload/v1/academy-desk/players/${ID}.jpg`, ID, "d.yz"), false);
});

test("profile fields appear only when set", () => {
  assert.deepEqual(profileJSON({}), {});
  assert.deepEqual(profileJSON({ photoUrl: "", heightCm: null, weightKg: undefined, nationality: "" }), {});
  assert.deepEqual(
    profileJSON({ photoUrl: "https://x/y.jpg", heightCm: 172, weightKg: 61, nationality: "India" }),
    { photoUrl: "https://x/y.jpg", heightCm: 172, weightKg: 61, nationality: "India" }
  );
  const p = playerJSON({ _id: ID, name: "Aarav", age: 16, sport: "Football", heightCm: 170 });
  assert.deepEqual(p, { id: ID, name: "Aarav", age: 16, sport: "Football", heightCm: 170 });
});

test("computeStats carries the profile through to every player row", () => {
  const players = [
    { _id: ID, name: "Aarav", age: 16, sport: "Football", photoUrl: "https://x/a.jpg", heightCm: 170, nationality: "India" },
    { _id: OTHER, name: "Bina", age: 15, sport: "Football" },
  ];
  const [a, b] = computeStats(players, [], []);
  assert.equal(a.photoUrl, "https://x/a.jpg");
  assert.equal(a.heightCm, 170);
  assert.equal(a.nationality, "India");
  assert.equal("photoUrl" in b, false);
  assert.equal("weightKg" in b, false);
});
