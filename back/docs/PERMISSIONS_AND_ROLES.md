# Permissions and Roles – Frontend Guide

This document describes how permissions and roles work in the API and how to build the permission management UI.

---

## 1. Concepts

### Roles
- A **role** is a named group (e.g. `admin`, `sales`, `sales_supervisor`, `support`) that has a **set of permissions** attached.
- A user has **one primary role** (e.g. from `assign-role`). The API returns `roles` (array) and `primary_role` (string) for each user.
- **Same role, different behaviour:** Users with the same role can have **extra permissions** assigned directly to them (e.g. a “sales” user who is a supervisor gets `clients.delete` and `sd_forms.manage_any` as direct permissions). The backend checks **permissions**, not role names, for authorization.

### Two kinds of “permissions” in the API

| Concept | Purpose | APIs |
|--------|---------|------|
| **Spatie abilities** | Fine-grained API/feature access (e.g. `clients.view`, `clients.manage`, `tickets.manage`). Used by the backend for every protected action. | `GET /abilities`, `GET /roles`, `PUT /users/:id/permissions`, role create/update |
| **Page permissions** | Per-role, per-page flags: `can_view`, `can_edit`, `can_delete`, `can_approve` for UI pages (e.g. “clients”, “users”). Used for page-level access in the app. | `GET /permissions`, `POST /permissions`, `GET /permissions/by-role/:roleId`, `DELETE /permissions/:id` |

For the **permission page** in the frontend you will mainly use **Spatie abilities** and **roles**; optionally you can also manage **page permissions** per role.

---

## 2. Permission scenario (same role, different control)

- **Sales employee:** Role `sales` → base permissions (e.g. view/manage clients, view/manage own SD forms). Cannot delete clients or manage other users’ forms.
- **Sales supervisor:** Either:
  - Role `sales_supervisor` (more permissions than `sales`), or
  - Role `sales` **plus** direct permissions such as `clients.delete`, `sd_forms.manage_any`, `reports.view`.

Effective permissions for a user = **role permissions** ∪ **direct permissions**. The backend always checks “does this user have permission X?” (e.g. `clients.delete`), so you can customize per user by:
- Changing their role, and/or
- Setting **direct permissions** via `PUT /users/:id/permissions`.

---

## 3. API reference (permissions & roles)

All routes below require **authentication** (`Authorization: Bearer <token>`). Base path: `/api/v1/`.

### 3.1 Spatie abilities (for permission matrix and role CRUD)

| Method | Endpoint | Description | Required permission |
|--------|----------|-------------|---------------------|
| GET | `/abilities` | List all ability names **grouped by domain** (e.g. `clients`, `sd_forms`, `tickets`). Use this to build the permission matrix in the UI. | `permissions.view` |
| GET | `/roles` | List all roles with their **Spatie permission names** (`id`, `name`, `permissions[]`). | `roles.view` |
| POST | `/roles` | Create a role. Body: `{ "name": "string", "permissions": ["perm1", "perm2"] }`. | `roles.manage` |
| PUT | `/roles/{role_id}` | Update a role (name and/or permissions). Body: `{ "name"?: "string", "permissions"?: ["perm1", ...] }`. Admin role cannot be modified. | `roles.manage` |
| DELETE | `/roles/{role_id}` | Delete a role. Admin role cannot be deleted. | `roles.manage` |

- **Abilities response** (GET `/abilities`):  
  `{ "data": { "users": ["users.view", "users.manage", ...], "clients": [...], ... } }`  
  Keys are domain labels; values are permission name arrays.

- **Roles response** (GET `/roles`):  
  `{ "data": [ { "id": 1, "name": "sales", "permissions": ["clients.view", "clients.manage", ...] }, ... ] }`

### 3.2 User role and direct permissions

| Method | Endpoint | Description | Required permission |
|--------|----------|-------------|---------------------|
| POST | `/users/{user_id}/assign-role` | Set user’s role. Body: `{ "role": "role_name" }`. Replaces existing role(s). | `users.manage` + update that user |
| PUT | `/users/{user_id}/permissions` | Set **direct permissions** for the user. Body: `{ "permissions": ["permission.name1", "permission.name2", ...] }`. Does not change role permissions; adds/overwrites only direct permissions. Use to give a user extra abilities (e.g. supervisor-level) without changing role. | `users.manage` + update that user |

- User object in **GET `/users`**, **GET `/users/:id`**, **GET `/profile`**, **GET `/auth/me`** and login response includes:
  - `roles`: array of role names  
  - `primary_role`: first role name  
  - **`permissions`**: array of **all** permission names the user has (from roles + direct). Use this to show/hide features in the app.

### 3.3 Page permissions (optional)

| Method | Endpoint | Description | Required permission |
|--------|----------|-------------|---------------------|
| GET | `/permissions` | List all **page permissions** (per role, per page: `can_view`, `can_edit`, `can_delete`, `can_approve`). | `permissions.view` |
| GET | `/permissions/by-role/{role_id}` | Page permissions for one role. | `permissions.view` |
| POST | `/permissions` | Create or update a page permission for a role. Body: `{ "role_id": number, "page": "string", "can_view"?: bool, "can_edit"?: bool, "can_delete"?: bool, "can_approve"?: bool }`. | `permissions.manage` |
| DELETE | `/permissions/{page_permission_id}` | Remove a page permission record. `page_permission_id` is the id from GET `/permissions`. | `permissions.manage` |

- Page permission object: `id`, `role_id`, `role_name`, `page`, `can_view`, `can_edit`, `can_delete`, `can_approve`.

---

## 4. Suggested flows for the permission page

### 4.1 Load data for the permission matrix
1. **GET `/abilities`** → build grouped list of all permission names (rows or columns by domain).
2. **GET `/roles`** → for each role, show which permissions it has (e.g. checkboxes).
3. For “edit role”:
   - Pre-fill from the role’s `permissions` array.
   - On save: **PUT `/roles/{role_id}`** with `{ "permissions": [...] }`.

### 4.2 Assign role to a user
- **POST `/users/{user_id}/assign-role`** with `{ "role": "sales_supervisor" }`.
- Then optionally **PUT `/users/{user_id}/permissions`** with `{ "permissions": ["clients.delete", "sd_forms.manage_any"] }` to add extra abilities for that user (same role, more control).

### 4.3 Show effective permissions for a user
- **GET `/users/{user_id}`** (or `/profile` for current user). Use the **`permissions`** array from the response to know what the user can do. No need to merge role + direct on the frontend; the API returns the merged list.

### 4.4 Optional: manage page-level access
- Use **GET `/permissions`** and **GET `/permissions/by-role/{role_id}`** to show per-role, per-page flags.
- Use **POST `/permissions`** and **DELETE `/permissions/{id}`** to change them.

---

## 5. Required permissions for the permission page

- **View roles and abilities:** `roles.view`, `permissions.view`.
- **Edit role permissions:** `roles.manage`.
- **Edit user role / direct permissions:** `users.manage` (and policy allows updating that user).
- **Edit page permissions:** `permissions.manage`.

Admin has all of these; other roles (e.g. `sales_manager`) may have a subset. Use the current user’s `permissions` array (from login or `/profile`) to show/hide sections of the permission UI.

---

## 6. Example: “Sales supervisor” vs “Sales employee”

- **Sales employee:** Role `sales`. Permissions from role only (e.g. `clients.view`, `clients.manage`, `sd_forms.view`, `sd_forms.manage`, `shipments.view_own`). No `clients.delete`, no `sd_forms.manage_any`.
- **Sales supervisor (option A):** Role `sales_supervisor`. Same area as sales but with extra permissions (e.g. `clients.delete`, `sd_forms.manage_any`, `reports.view`).
- **Sales supervisor (option B):** Role `sales` + direct permissions `["clients.delete", "sd_forms.manage_any", "reports.view"]` via **PUT `/users/{user_id}/permissions`**.

The backend does not care which option you use; it only checks `user->can('permission.name')`. The permission page can offer both: choose role and optionally add/remove direct permissions per user.

---

## 7. Postman collection

The **Roles & Permissions** folder in the Postman collection includes:

- List Roles  
- List Abilities (Spatie)  
- Create Role / Update Role / Delete Role  
- List Page Permissions  
- Get Page Permissions By Role  
- Upsert Page Permission  
- Delete Page Permission  

The **Users** folder includes:

- Assign Role  
- Sync User Permissions  

Use `{{base_url}}`, `{{token}}`, `{{user_id}}`, `{{role_id}}`, `{{page_permission_id}}` as needed.
