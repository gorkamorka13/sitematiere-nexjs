import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'VISITOR']);

export const projectTypeEnum = pgEnum('project_type', ['PRS', 'PEB', 'MPB', 'MXB', 'UB', 'PASSERELLE', 'AUTRE']);

export const projectStatusEnum = pgEnum('project_status', ['DONE', 'CURRENT', 'PROSPECT']);

export const documentTypeEnum = pgEnum('document_type', ['PLAN', 'FLAG', 'CLIENT_LOGO', 'OTHER', 'PIN']);

export const fileTypeEnum = pgEnum('file_type', ['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'ARCHIVE', 'OTHER']);
