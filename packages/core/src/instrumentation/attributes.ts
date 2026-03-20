/** HTTP route attribute (e.g. /api/auth/sign-in). */
export const ATTR_HTTP_ROUTE = "http.route" as const;

/** HTTP response status code. */
export const ATTR_HTTP_RESPONSE_STATUS_CODE =
	"http.response.status_code" as const;

/** Database collection name. */
export const ATTR_DB_COLLECTION_NAME = "db.collection.name" as const;

/** Database operation name. */
export const ATTR_DB_OPERATION_NAME = "db.operation.name" as const;

/** Operation identifier (e.g. getSession, signUpWithEmailAndPassword). */
export const ATTR_OPERATION_ID = "better_auth.operation_id" as const;

/** Hook type (e.g. before, after). */
export const ATTR_HOOK_TYPE = "better_auth.hook.type" as const;

/** Execution context (e.g. user, plugin:id). */
export const ATTR_CONTEXT = "better_auth.context" as const;
