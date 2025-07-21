-- ===========================
-- USERS
-- ===========================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================
-- FOLLOWS
-- ===========================
CREATE TABLE follows (
  follower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- ===========================
-- NOTIFICATION TYPES
-- ===========================
CREATE TABLE notification_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL         -- e.g. 'post_like', 'new_follower', 'system_announcement'
);

-- ===========================
-- NOTIFICATION EVENTS
-- ===========================
CREATE TABLE notification_events (
  id BIGSERIAL PRIMARY KEY,
  type_id INT NOT NULL REFERENCES notification_types(id),
  actor_id INT REFERENCES users(id) ON DELETE SET NULL, -- NULL = system notification
  object_type VARCHAR(50) NOT NULL,                     -- e.g. 'post', 'comment', 'job'
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX idx_events_actor_id ON notification_events(actor_id);
CREATE INDEX idx_events_created_at ON notification_events(created_at);

-- ===========================
-- NOTIFICATION RECIPIENTS
-- ===========================
CREATE TABLE notification_recipients (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_recipients_user_id ON notification_recipients(user_id);
CREATE INDEX idx_recipients_user_read ON notification_recipients(user_id, read_at);
CREATE INDEX idx_recipients_user_delivered ON notification_recipients(user_id, delivered_at);
