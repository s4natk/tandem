import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { env, s3Enabled } from "../../config/env.js";
import { ServiceUnavailableError } from "../../errors/index.js";

let _client: S3Client | null = null;

function client(): S3Client {
  if (!s3Enabled) {
    throw new ServiceUnavailableError(
      "S3 is not configured on this server. Set S3_BUCKET and AWS credentials to enable file uploads.",
    );
  }
  if (!_client) {
    _client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export function isS3Enabled(): boolean {
  return s3Enabled;
}

export async function createUploadUrl(args: {
  roomId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
}): Promise<{ url: string; key: string; expiresIn: number }> {
  const c = client();
  // Object keys are unguessable and partitioned by room for clean lifecycle
  // policies and bucket-level prefix permissions.
  const key = `rooms/${args.roomId}/${nanoid(16)}-${encodeURIComponent(args.filename)}`;
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: args.mimeType,
    Metadata: { uploader: args.uploaderId, room: args.roomId },
  });
  const url = await getSignedUrl(c, cmd, { expiresIn: env.S3_PRESIGN_TTL_SECONDS });
  return { url, key, expiresIn: env.S3_PRESIGN_TTL_SECONDS };
}

export async function createDownloadUrl(key: string): Promise<string> {
  const c = client();
  const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(c, cmd, { expiresIn: env.S3_PRESIGN_TTL_SECONDS });
}
