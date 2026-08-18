import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Storage de objetos (README 6, 13, 54). MinIO/S3/R2 via API S3.
const bucket = process.env.STORAGE_BUCKET ?? "postador-media";

export const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "us-east-1",
  endpoint: process.env.STORAGE_ENDPOINT ?? "http://localhost:9000",
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "minioadmin",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "minioadmin",
  },
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

// URL assinada de upload (README 13): frontend envia direto ao storage.
export async function presignPut(key: string, contentType: string): Promise<string> {
  await ensureBucket();
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 3600 },
  );
}

// URL assinada de leitura para preview/publicação.
export function presignGet(key: string, expiresIn = 7 * 24 * 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
