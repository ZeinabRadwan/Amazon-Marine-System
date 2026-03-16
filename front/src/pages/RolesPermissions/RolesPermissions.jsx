import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getStoredToken } from "../Login";
import {
  listRoles,
  listPermissions,
  upsertPermission,
  deletePagePermission,
  listAbilities,
  getPermissionsByRole,
  createRole,
  updateRole,
  deleteRole,
} from "../../api/roles";
import { Container } from "../../components/Container";
import "../../components/PageHeader/PageHeader.css";
import LoaderDots from "../../components/LoaderDots";
import Alert from "../../components/Alert";
import Tabs from "../../components/Tabs";
import Pagination from "../../components/Pagination";
import { X, Pencil, Trash2, Eye } from "lucide-react";
import "../../components/LoaderDots/LoaderDots.css";
import "../Clients/Clients.css";
import "../Clients/ClientDetailModal.css";
import "./RolesPermissions.css";

export default function RolesPermissions() {
  const { t } = useTranslation();
  const token = getStoredToken();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [abilities, setAbilities] = useState([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [loadingAllPerms, setLoadingAllPerms] = useState(false);
  const [showUpsert, setShowUpsert] = useState(false);
  const [upsertSubmitting, setUpsertSubmitting] = useState(false);
  const [upsertForm, setUpsertForm] = useState({
    role_id: "",
    page: "",
    can_view: true,
    can_edit: false,
    can_delete: false,
    can_approve: false,
  });
  const [deletePermissionId, setDeletePermissionId] = useState(null);
  const [deletePermissionSubmitting, setDeletePermissionSubmitting] =
    useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState({
    name: "",
    permissions: [],
  });
  const [createRoleSubmitting, setCreateRoleSubmitting] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleForm, setEditRoleForm] = useState({
    name: "",
    permissions: [],
  });
  const [editRoleSubmitting, setEditRoleSubmitting] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);
  const [deleteRoleSubmitting, setDeleteRoleSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("roles");
  const [permPage, setPermPage] = useState(1);
  const [permPerPage, setPermPerPage] = useState(25);
  const [viewByRoleId, setViewByRoleId] = useState(null);
  const [viewByRolePerms, setViewByRolePerms] = useState([]);
  const [viewByRoleLoading, setViewByRoleLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setAlert(null);
    listRoles(token)
      .then((data) => {
        const list = data.data ?? data.roles ?? data;
        setRoles(Array.isArray(list) ? list : []);
      })
      .catch(() =>
        setAlert({ type: "error", message: t("rolesPermissions.error") }),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoadingAllPerms(true);
    listPermissions(token)
      .then((data) => {
        const list = data.data ?? data.permissions ?? data;
        setAllPermissions(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllPermissions([]))
      .finally(() => setLoadingAllPerms(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setAbilitiesLoading(true);
    listAbilities(token)
      .then((data) => {
        const raw = data.data ?? data.abilities ?? data;
        if (Array.isArray(raw)) {
          setAbilities(raw);
        } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          // Backend returns { data: { users: [...], clients: [...], ... } }
          const flattened = Object.values(raw).flat().filter(Boolean);
          setAbilities(flattened);
        } else {
          setAbilities([]);
        }
      })
      .catch(() => setAbilities([]))
      .finally(() => setAbilitiesLoading(false));
  }, [token]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(allPermissions.length / permPerPage));
    if (permPage > maxPage) setPermPage(maxPage);
  }, [allPermissions.length, permPerPage, permPage]);

  const getRoleName = (roleId) => {
    const r = roles.find((x) => String(x.id) === String(roleId));
    return r?.name ?? r?.slug ?? roleId ?? t("rolesPermissions.dash");
  };

  const handleUpsertSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setUpsertSubmitting(true);
    try {
      await upsertPermission(token, {
        role_id: Number(upsertForm.role_id) || upsertForm.role_id,
        page: upsertForm.page,
        can_view: !!upsertForm.can_view,
        can_edit: !!upsertForm.can_edit,
        can_delete: !!upsertForm.can_delete,
        can_approve: !!upsertForm.can_approve,
      });
      setShowUpsert(false);
      const allRes = await listPermissions(token);
      const allList = allRes.data ?? allRes.permissions ?? allRes;
      setAllPermissions(Array.isArray(allList) ? allList : []);
      setAlert({
        type: "success",
        message: t("rolesPermissions.saved", "Permission saved."),
      });
    } catch {
      setAlert({ type: "error", message: t("rolesPermissions.error") });
    } finally {
      setUpsertSubmitting(false);
    }
  };

  const openUpsert = (perm = null) => {
    setUpsertForm({
      role_id: perm?.role_id ?? roles[0]?.id ?? "",
      page: perm?.page ?? "",
      can_view: perm?.can_view ?? true,
      can_edit: perm?.can_edit ?? false,
      can_delete: perm?.can_delete ?? false,
      can_approve: perm?.can_approve ?? false,
    });
    setShowUpsert(true);
  };

  const handleDeletePermissionConfirm = async () => {
    if (!deletePermissionId || !token) return;
    setAlert(null);
    setDeletePermissionSubmitting(true);
    try {
      await deletePagePermission(token, deletePermissionId);
      setDeletePermissionId(null);
      const res = await listPermissions(token);
      const list = res.data ?? res.permissions ?? res;
      setAllPermissions(Array.isArray(list) ? list : []);
      setAlert({
        type: "success",
        message: t("rolesPermissions.permissionDeleted"),
      });
    } catch {
      setAlert({ type: "error", message: t("rolesPermissions.error") });
    } finally {
      setDeletePermissionSubmitting(false);
    }
  };

  const openCreateRole = () => {
    setCreateRoleForm({ name: "", permissions: [] });
    setShowCreateRole(true);
  };

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setCreateRoleSubmitting(true);
    try {
      await createRole(token, {
        name: createRoleForm.name.trim(),
        permissions: createRoleForm.permissions,
      });
      setShowCreateRole(false);
      const data = await listRoles(token);
      const list = data.data ?? data.roles ?? data;
      setRoles(Array.isArray(list) ? list : []);
      setAlert({ type: "success", message: t("rolesPermissions.roleCreated") });
    } catch {
      setAlert({ type: "error", message: t("rolesPermissions.error") });
    } finally {
      setCreateRoleSubmitting(false);
    }
  };

  const openEditRole = (role) => {
    setEditRoleId(role.id);
    const perms = role.permissions ?? [];
    setEditRoleForm({
      name: role.name ?? role.slug ?? "",
      permissions: Array.isArray(perms) ? perms : [],
    });
    setShowEditRole(true);
  };

  const openViewByRole = (role) => {
    setViewByRoleId(role.id);
    setViewByRolePerms([]);
    setViewByRoleLoading(true);
    getPermissionsByRole(token, role.id)
      .then((data) => {
        const list = data.data ?? data.permissions ?? data;
        setViewByRolePerms(Array.isArray(list) ? list : []);
      })
      .catch(() => setViewByRolePerms([]))
      .finally(() => setViewByRoleLoading(false));
  };

  const handleEditRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editRoleId || !token) return;
    setAlert(null);
    setEditRoleSubmitting(true);
    try {
      await updateRole(token, editRoleId, {
        name: editRoleForm.name.trim(),
        permissions: editRoleForm.permissions,
      });
      setShowEditRole(false);
      setEditRoleId(null);
      const data = await listRoles(token);
      const list = data.data ?? data.roles ?? data;
      setRoles(Array.isArray(list) ? list : []);
      setAlert({ type: "success", message: t("rolesPermissions.roleUpdated") });
    } catch {
      setAlert({ type: "error", message: t("rolesPermissions.error") });
    } finally {
      setEditRoleSubmitting(false);
    }
  };

  const handleDeleteRoleConfirm = async () => {
    if (!deleteRoleId || !token) return;
    setAlert(null);
    setDeleteRoleSubmitting(true);
    try {
      await deleteRole(token, deleteRoleId);
      setDeleteRoleId(null);
      const data = await listRoles(token);
      const list = data.data ?? data.roles ?? data;
      setRoles(Array.isArray(list) ? list : []);
      const res = await listPermissions(token);
      const permList = res.data ?? res.permissions ?? res;
      setAllPermissions(Array.isArray(permList) ? permList : []);
      setAlert({ type: "success", message: t("rolesPermissions.roleDeleted") });
    } catch {
      setAlert({ type: "error", message: t("rolesPermissions.error") });
    } finally {
      setDeleteRoleSubmitting(false);
    }
  };

  const abilityList = abilities
    .map((a) => (typeof a === "string" ? a : (a.name ?? a.ability ?? a)))
    .filter(Boolean);
  const totalPermPages = Math.max(
    1,
    Math.ceil(allPermissions.length / permPerPage),
  );
  const safePermPage = Math.min(permPage, totalPermPages);
  const paginatedPerms = allPermissions.slice(
    (safePermPage - 1) * permPerPage,
    safePermPage * permPerPage,
  );
  const toggleAbility = (list, name, setter) => {
    if (list.includes(name)) setter(list.filter((x) => x !== name));
    else setter([...list, name]);
  };

  const pageLoading =
    loading ||
    upsertSubmitting ||
    createRoleSubmitting ||
    editRoleSubmitting ||
    deleteRoleSubmitting ||
    deletePermissionSubmitting;

  const PermissionBadge = ({ on }) =>
    on ? (
      <span
        className="rp-perm-badge rp-perm-badge--on"
        title={t("rolesPermissions.yes")}
        aria-label={t("rolesPermissions.yes")}
      >
        ✓
      </span>
    ) : (
      <span
        className="rp-perm-badge rp-perm-badge--off"
        title={t("rolesPermissions.no")}
        aria-label={t("rolesPermissions.no")}
      >
        —
      </span>
    );

  return (
    <Container size="xl">
      <div className="clients-page rp-page">
        {pageLoading && (
          <div
            className="clients-page-loader"
            aria-live="polite"
            aria-busy="true"
          >
            <LoaderDots />
          </div>
        )}

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {!loading && roles.length === 0 && (
          <div className="rp-empty-state">
            <p className="clients-empty">{t("rolesPermissions.noRoles")}</p>
            <button
              type="button"
              className="page-header__btn page-header__btn--primary"
              onClick={openCreateRole}
            >
              {t("rolesPermissions.createRole")}
            </button>
          </div>
        )}

        {!loading && roles.length > 0 && (
          <>
            <div className="rp-main-grid">
              <Tabs
                tabs={[
                  { id: "roles", label: t("rolesPermissions.roles") },
                  {
                    id: "pagePermissions",
                    label: t("rolesPermissions.allPagePermissions"),
                  },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="rp-tabs"
              />
              <div
                role="tabpanel"
                id="panel-roles"
                aria-labelledby="tab-roles"
                hidden={activeTab !== "roles"}
                className="rp-tab-panel"
              >
                <aside className="rp-panel rp-panel--roles">
                  <div className="rp-panel__head">
                    <h2 className="rp-panel__title">
                      {t("rolesPermissions.roles")}
                    </h2>
                    <button
                      type="button"
                      className="rp-panel__action page-header__btn page-header__btn--primary"
                      onClick={openCreateRole}
                    >
                      {t("rolesPermissions.createRole")}
                    </button>
                  </div>
                  <div className="clients-table-wrap">
                    <table className="clients-table rp-roles-table">
                      <thead>
                        <tr>
                          <th>{t("rolesPermissions.role")}</th>
                          <th className="rp-th--actions">
                            {t("rolesPermissions.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <span className="rp-cell-role">
                                {r.name ?? r.slug ?? r.id}
                              </span>
                            </td>
                            <td className="rp-td--actions">
                              <div className="rp-table-actions">
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon"
                                  onClick={() => openViewByRole(r)}
                                  title={t(
                                    "rolesPermissions.viewPagePermissions",
                                  )}
                                  aria-label={t(
                                    "rolesPermissions.viewPagePermissions",
                                  )}
                                >
                                  <Eye
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon"
                                  onClick={() => openEditRole(r)}
                                  title={t("rolesPermissions.editRole")}
                                  aria-label={t("rolesPermissions.editRole")}
                                >
                                  <Pencil
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="clients-filters__btn-icon rp-btn--danger"
                                  onClick={() => setDeleteRoleId(r.id)}
                                  title={t("rolesPermissions.deleteRole")}
                                  aria-label={t(
                                    "rolesPermissions.deleteRole",
                                  )}
                                >
                                  <Trash2
                                    className="clients-filters__btn-icon-svg"
                                    size={18}
                                    aria-hidden
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </aside>
              </div>
              <div
                role="tabpanel"
                id="panel-pagePermissions"
                aria-labelledby="tab-pagePermissions"
                hidden={activeTab !== "pagePermissions"}
                className="rp-tab-panel"
              >
                <section className="rp-panel rp-panel--permissions">
                  <div className="rp-panel__head">
                    <h2 className="rp-panel__title">
                      {t("rolesPermissions.allPagePermissions")}
                    </h2>
                  </div>
                  {loadingAllPerms ? (
                    <p className="rp-section__loading">
                      {t("rolesPermissions.loading")}
                    </p>
                  ) : allPermissions.length === 0 ? (
                    <div className="rp-empty-state rp-empty-state--inline">
                      <p className="clients-empty">
                        {t("rolesPermissions.noPermissionsList")}
                      </p>
                      <button
                        type="button"
                        className="page-header__btn page-header__btn--primary"
                        onClick={() => openUpsert()}
                        disabled={roles.length === 0}
                      >
                        {t("rolesPermissions.upsertPermission")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="clients-table-wrap">
                        <table className="clients-table rp-permissions-table">
                          <thead>
                            <tr>
                              <th>{t("rolesPermissions.role")}</th>
                              <th>{t("rolesPermissions.page")}</th>
                              <th className="rp-th--center">
                                {t("rolesPermissions.canView")}
                              </th>
                              <th className="rp-th--center">
                                {t("rolesPermissions.canEdit")}
                              </th>
                              <th className="rp-th--center">
                                {t("rolesPermissions.canDelete")}
                              </th>
                              <th className="rp-th--center">
                                {t("rolesPermissions.canApprove")}
                              </th>
                              <th className="rp-th--actions"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPerms.map((p, i) => (
                              <tr
                                key={
                                  p.id ??
                                  p.role_id + "-" + (p.page ?? "") + "-" + i
                                }
                              >
                                <td>
                                  <span className="rp-cell-role">
                                    {getRoleName(p.role_id)}
                                  </span>
                                </td>
                                <td>
                                  <span className="rp-cell-page">
                                    {p.page ?? t("rolesPermissions.dash")}
                                  </span>
                                </td>
                                <td className="rp-td--center">
                                  <PermissionBadge on={p.can_view} />
                                </td>
                                <td className="rp-td--center">
                                  <PermissionBadge on={p.can_edit} />
                                </td>
                                <td className="rp-td--center">
                                  <PermissionBadge on={p.can_delete} />
                                </td>
                                <td className="rp-td--center">
                                  <PermissionBadge on={p.can_approve} />
                                </td>
                                <td className="rp-td--actions">
                                  <div className="rp-table-actions">
                                    <button
                                      type="button"
                                      className="clients-filters__btn-icon"
                                      onClick={() => openUpsert(p)}
                                      title={t(
                                        "rolesPermissions.upsertPermission",
                                      )}
                                      aria-label={t(
                                        "rolesPermissions.upsertPermission",
                                      )}
                                    >
                                      <Pencil
                                        className="clients-filters__btn-icon-svg"
                                        size={18}
                                        aria-hidden
                                      />
                                    </button>
                                    {p.id != null && (
                                      <button
                                        type="button"
                                        className="clients-filters__btn-icon rp-btn--danger"
                                        onClick={() =>
                                          setDeletePermissionId(p.id)
                                        }
                                        title={t(
                                          "rolesPermissions.deletePermission",
                                        )}
                                        aria-label={t(
                                          "rolesPermissions.deletePermission",
                                        )}
                                      >
                                        <Trash2
                                          className="clients-filters__btn-icon-svg"
                                          size={18}
                                          aria-hidden
                                        />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
                <footer className="rp-pagination-bar">
                  <div className="rp-pagination-bar__left">
                    <span className="rp-pagination-bar__total">
                      {t("rolesPermissions.total")}: {allPermissions.length}
                    </span>
                    <label className="rp-pagination-bar__per-page">
                      <span className="rp-pagination-bar__per-page-label">
                        {t("rolesPermissions.perPage")}
                      </span>
                      <select
                        value={permPerPage}
                        onChange={(e) => {
                          setPermPerPage(Number(e.target.value));
                          setPermPage(1);
                        }}
                        className="clients-select rp-pagination-bar__select"
                        aria-label={t("rolesPermissions.perPage")}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </label>
                  </div>
                  <Pagination
                    currentPage={safePermPage}
                    totalPages={totalPermPages}
                    onPageChange={setPermPage}
                    className="rp-pagination"
                  />
                </footer>
              </div>
            </div>
          </>
        )}

        {showUpsert && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-upsert-modal-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => setShowUpsert(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2
                  id="rp-upsert-modal-title"
                  className="client-detail-modal__title"
                >
                  {t("rolesPermissions.upsertPermission")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowUpsert(false)}
                  disabled={upsertSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleUpsertSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-grid">
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label htmlFor="upsert-role">
                            {t("rolesPermissions.role")}
                          </label>
                          <select
                            id="upsert-role"
                            value={upsertForm.role_id}
                            onChange={(e) =>
                              setUpsertForm((f) => ({
                                ...f,
                                role_id: e.target.value,
                              }))
                            }
                            required
                            disabled={upsertSubmitting}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name ?? r.slug ?? r.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label htmlFor="upsert-page">
                            {t("rolesPermissions.page")}
                          </label>
                          <input
                            id="upsert-page"
                            type="text"
                            value={upsertForm.page}
                            onChange={(e) =>
                              setUpsertForm((f) => ({
                                ...f,
                                page: e.target.value,
                              }))
                            }
                            placeholder={t("rolesPermissions.pagePlaceholder")}
                            required
                            disabled={upsertSubmitting}
                          />
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label className="client-detail-modal__form-field--check-label">
                            <input
                              type="checkbox"
                              checked={upsertForm.can_view}
                              onChange={(e) =>
                                setUpsertForm((f) => ({
                                  ...f,
                                  can_view: e.target.checked,
                                }))
                              }
                              disabled={upsertSubmitting}
                            />
                            {t("rolesPermissions.canView")}
                          </label>
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label className="client-detail-modal__form-field--check-label">
                            <input
                              type="checkbox"
                              checked={upsertForm.can_edit}
                              onChange={(e) =>
                                setUpsertForm((f) => ({
                                  ...f,
                                  can_edit: e.target.checked,
                                }))
                              }
                              disabled={upsertSubmitting}
                            />
                            {t("rolesPermissions.canEdit")}
                          </label>
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label className="client-detail-modal__form-field--check-label">
                            <input
                              type="checkbox"
                              checked={upsertForm.can_delete}
                              onChange={(e) =>
                                setUpsertForm((f) => ({
                                  ...f,
                                  can_delete: e.target.checked,
                                }))
                              }
                              disabled={upsertSubmitting}
                            />
                            {t("rolesPermissions.canDelete")}
                          </label>
                        </div>
                        <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                          <label className="client-detail-modal__form-field--check-label">
                            <input
                              type="checkbox"
                              checked={upsertForm.can_approve}
                              onChange={(e) =>
                                setUpsertForm((f) => ({
                                  ...f,
                                  can_approve: e.target.checked,
                                }))
                              }
                              disabled={upsertSubmitting}
                            />
                            {t("rolesPermissions.canApprove")}
                          </label>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowUpsert(false)}
                    disabled={upsertSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={upsertSubmitting}
                  >
                    {upsertSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deletePermissionId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-delete-perm-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() =>
                !deletePermissionSubmitting && setDeletePermissionId(null)
              }
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-delete-perm-title">
                  {t("rolesPermissions.deletePermission")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setDeletePermissionId(null)}
                  disabled={deletePermissionSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p>{t("rolesPermissions.deletePermissionConfirm")}</p>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setDeletePermissionId(null)}
                  disabled={deletePermissionSubmitting}
                >
                  {t("rolesPermissions.cancel")}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--danger"
                  onClick={handleDeletePermissionConfirm}
                  disabled={deletePermissionSubmitting}
                >
                  {deletePermissionSubmitting
                    ? t("rolesPermissions.saving")
                    : t("rolesPermissions.deletePermission")}
                </button>
              </footer>
            </div>
          </div>
        )}

        {showCreateRole && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-create-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !createRoleSubmitting && setShowCreateRole(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-create-role-title">
                  {t("rolesPermissions.createRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreateRole(false)}
                  disabled={createRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleCreateRoleSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="create-role-name">
                          {t("rolesPermissions.roleName")}
                        </label>
                        <input
                          id="create-role-name"
                          type="text"
                          value={createRoleForm.name}
                          onChange={(e) =>
                            setCreateRoleForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          required
                          disabled={createRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label>{t("rolesPermissions.abilities")}</label>
                        <div className="rp-abilities-list">
                          {abilitiesLoading ? (
                            <p className="rp-empty-small">
                              {t("rolesPermissions.loading")}
                            </p>
                          ) : abilityList.length === 0 ? (
                            <p className="rp-empty-small">
                              {t("rolesPermissions.noAbilities")}
                            </p>
                          ) : (
                            abilityList.map((name) => (
                              <label
                                key={name}
                                className="client-detail-modal__form-field--check-label"
                              >
                                <input
                                  type="checkbox"
                                  checked={createRoleForm.permissions.includes(
                                    name,
                                  )}
                                  onChange={() =>
                                    toggleAbility(
                                      createRoleForm.permissions,
                                      name,
                                      (next) =>
                                        setCreateRoleForm((f) => ({
                                          ...f,
                                          permissions: next,
                                        })),
                                    )
                                  }
                                  disabled={createRoleSubmitting}
                                />
                                {name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowCreateRole(false)}
                    disabled={createRoleSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={createRoleSubmitting}
                  >
                    {createRoleSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {showEditRole && editRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-edit-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !editRoleSubmitting && setShowEditRole(false)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-edit-role-title">
                  {t("rolesPermissions.editRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowEditRole(false)}
                  disabled={editRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form
                onSubmit={handleEditRoleSubmit}
                className="client-detail-modal__form"
              >
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label htmlFor="edit-role-name">
                          {t("rolesPermissions.roleName")}
                        </label>
                        <input
                          id="edit-role-name"
                          type="text"
                          value={editRoleForm.name}
                          onChange={(e) =>
                            setEditRoleForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          required
                          disabled={editRoleSubmitting}
                        />
                      </div>
                      <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                        <label>{t("rolesPermissions.abilities")}</label>
                        <div className="rp-abilities-list">
                          {abilitiesLoading ? (
                            <p className="rp-empty-small">
                              {t("rolesPermissions.loading")}
                            </p>
                          ) : abilityList.length === 0 ? (
                            <p className="rp-empty-small">
                              {t("rolesPermissions.noAbilities")}
                            </p>
                          ) : (
                            abilityList.map((name) => (
                              <label
                                key={name}
                                className="client-detail-modal__form-field--check-label"
                              >
                                <input
                                  type="checkbox"
                                  checked={editRoleForm.permissions.includes(
                                    name,
                                  )}
                                  onChange={() =>
                                    toggleAbility(
                                      editRoleForm.permissions,
                                      name,
                                      (next) =>
                                        setEditRoleForm((f) => ({
                                          ...f,
                                          permissions: next,
                                        })),
                                    )
                                  }
                                  disabled={editRoleSubmitting}
                                />
                                {name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowEditRole(false)}
                    disabled={editRoleSubmitting}
                  >
                    {t("rolesPermissions.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="client-detail-modal__btn client-detail-modal__btn--primary"
                    disabled={editRoleSubmitting}
                  >
                    {editRoleSubmitting
                      ? t("rolesPermissions.saving")
                      : t("rolesPermissions.save")}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deleteRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-delete-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => !deleteRoleSubmitting && setDeleteRoleId(null)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-delete-role-title">
                  {t("rolesPermissions.deleteRole")}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setDeleteRoleId(null)}
                  disabled={deleteRoleSubmitting}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                <p>{t("rolesPermissions.deleteRoleConfirm")}</p>
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setDeleteRoleId(null)}
                  disabled={deleteRoleSubmitting}
                >
                  {t("rolesPermissions.cancel")}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--danger"
                  onClick={handleDeleteRoleConfirm}
                  disabled={deleteRoleSubmitting}
                >
                  {deleteRoleSubmitting
                    ? t("rolesPermissions.saving")
                    : t("rolesPermissions.deleteRole")}
                </button>
              </footer>
            </div>
          </div>
        )}

        {viewByRoleId != null && (
          <div
            className="client-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-view-by-role-title"
          >
            <div
              className="client-detail-modal__backdrop"
              onClick={() => setViewByRoleId(null)}
            />
            <div className="client-detail-modal__box client-detail-modal__box--form client-detail-modal__box--wide">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="rp-view-by-role-title">
                  {t("rolesPermissions.permissionsFor", {
                    role: getRoleName(viewByRoleId),
                  })}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setViewByRoleId(null)}
                  aria-label={t("rolesPermissions.close")}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                {viewByRoleLoading ? (
                  <p className="rp-section__loading">
                    {t("rolesPermissions.loading")}
                  </p>
                ) : viewByRolePerms.length === 0 ? (
                  <p className="rp-empty">
                    {t("rolesPermissions.noPermissions")}
                  </p>
                ) : (
                  <div className="clients-table-wrap">
                    <table className="clients-table">
                      <thead>
                        <tr>
                          <th>{t("rolesPermissions.page")}</th>
                          <th>{t("rolesPermissions.canView")}</th>
                          <th>{t("rolesPermissions.canEdit")}</th>
                          <th>{t("rolesPermissions.canDelete")}</th>
                          <th>{t("rolesPermissions.canApprove")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewByRolePerms.map((p, i) => (
                          <tr key={p.id ?? (p.page ?? "") + "-" + i}>
                            <td>{p.page ?? t("rolesPermissions.dash")}</td>
                            <td>
                              <PermissionBadge on={p.can_view} />
                            </td>
                            <td>
                              <PermissionBadge on={p.can_edit} />
                            </td>
                            <td>
                              <PermissionBadge on={p.can_delete} />
                            </td>
                            <td>
                              <PermissionBadge on={p.can_approve} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={() => setViewByRoleId(null)}
                >
                  {t("rolesPermissions.close")}
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
