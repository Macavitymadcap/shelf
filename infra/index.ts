import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';

const accountId = new pulumi.Config().require('accountId');

const database = new cloudflare.D1Database(
  'catalogue',
  {
    accountId,
    name: 'shelf',
    primaryLocationHint: 'weur',
  },
  { protect: true },
);

const covers = new cloudflare.R2Bucket('covers', {
  accountId,
  name: 'shelf-covers',
  location: 'weur',
  storageClass: 'Standard',
});

export const databaseId = database.uuid;
export const bucketName = covers.name;
