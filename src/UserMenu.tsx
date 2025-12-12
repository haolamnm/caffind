import { useState } from "react";
import { useAuth } from "./AuthContext";
import "./Auth.css";

interface UserMenuProps {
  onOpenAuth: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export function UserMenu({ onOpenAuth, onToggleChat, isChatOpen }: UserMenuProps) {
  const { user, loading, logout, deleteAccount } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (loading) {
    return <div className="user-menu-loading">...</div>;
  }

  if (!user) {
    return (
      <button className="login-btn" onClick={onOpenAuth}>
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        Log In
      </button>
    );
  }

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteConfirm(false);
      setIsMenuOpen(false);
    } catch {
      // Error is handled by context
    } finally {
      setIsDeleting(false);
    }
  };

  const userInitial = user.displayName?.[0] || user.email?.[0] || "U";
  const userName = user.displayName || user.email || "User";

  return (
    <div className="user-menu">
      <button
        className="user-avatar-btn"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title={userName}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={userName} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-initial">{userInitial.toUpperCase()}</span>
        )}
      </button>

      {isMenuOpen && (
        <>
          <div
            className="user-menu-backdrop"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-name">{userName}</div>
              {user.email && <div className="user-menu-email">{user.email}</div>}
            </div>

            <div className="user-menu-divider" />

            <button
              className="user-menu-item"
              onClick={() => {
                onToggleChat?.();
                setIsMenuOpen(false);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {isChatOpen ? "Close Chat" : "Coffee Chat"}
            </button>

            <div className="user-menu-divider" />

            <button className="user-menu-item" onClick={handleLogout}>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log Out
            </button>

            <button
              className="user-menu-item danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete Account
            </button>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <div
          className="auth-modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete Account?</h3>
            <p>
              This action cannot be undone. All your data will be permanently
              deleted.
            </p>
            <div className="delete-confirm-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
