import numpy as np

class KalmanBoxTracker:
    """
    Kalman Filter for tracking bounding boxes in image space.
    State vector: [x, y, s, r, dx, dy, ds]
    where (x, y) is the bounding box center, s is scale (area = w * h),
    r is aspect ratio (w / h), and dx, dy, ds are velocities.
    """

    count = 0

    def __init__(self, bbox: list):
        # State vector: [x, y, s, r, dx, dy, ds]^T (7x1)
        self.dim_x = 7
        self.dim_z = 4

        # State transition matrix F
        self.F = np.eye(self.dim_x, dtype=np.float32)
        for i in range(3):
            self.F[i, i + 4] = 1.0  # Constant velocity model: pos += vel * dt

        # Measurement function H (we observe x, y, s, r)
        self.H = np.zeros((self.dim_z, self.dim_x), dtype=np.float32)
        for i in range(self.dim_z):
            self.H[i, i] = 1.0

        # Measurement uncertainty R
        self.R = np.eye(self.dim_z, dtype=np.float32) * 1.0
        self.R[2:, 2:] *= 10.0

        # State covariance P
        self.P = np.eye(self.dim_x, dtype=np.float32) * 10.0
        self.P[4:, 4:] *= 1000.0  # High initial uncertainty for velocities

        # Process noise Q
        self.Q = np.eye(self.dim_x, dtype=np.float32) * 0.01
        self.Q[4:, 4:] *= 0.01

        # Initial state x
        self.x = np.zeros((self.dim_x, 1), dtype=np.float32)
        self.x[:self.dim_z] = self.convert_bbox_to_z(bbox)

        self.time_since_update = 0
        self.id = KalmanBoxTracker.count
        KalmanBoxTracker.count += 1
        self.history = []
        self.hits = 1
        self.hit_streak = 1
        self.age = 0

    @staticmethod
    def convert_bbox_to_z(bbox: list) -> np.ndarray:
        """Takes [x1, y1, x2, y2] and returns [center_x, center_y, area, aspect_ratio]^T."""
        w = max(1e-4, bbox[2] - bbox[0])
        h = max(1e-4, bbox[3] - bbox[1])
        x = bbox[0] + w / 2.0
        y = bbox[1] + h / 2.0
        s = w * h
        r = w / float(h)
        return np.array([x, y, s, r], dtype=np.float32).reshape((4, 1))

    @staticmethod
    def convert_x_to_bbox(x: np.ndarray) -> list:
        """Takes [center_x, center_y, area, aspect_ratio]^T and returns [x1, y1, x2, y2]."""
        w = np.sqrt(max(1e-4, x[2, 0] * x[3, 0]))
        h = max(1e-4, x[2, 0] / max(1e-4, w))
        return [
            float(x[0, 0] - w / 2.0),
            float(x[1, 0] - h / 2.0),
            float(x[0, 0] + w / 2.0),
            float(x[1, 0] + h / 2.0)
        ]

    def predict(self) -> list:
        """Advances the state vector and returns the predicted bounding box."""
        if (self.x[6, 0] + self.x[2, 0]) <= 0:
            self.x[6, 0] = 0.0

        # x = F * x
        self.x = np.dot(self.F, self.x)
        # P = F * P * F^T + Q
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q

        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1
        pred_box = self.convert_x_to_bbox(self.x)
        self.history.append(pred_box)
        return pred_box

    def update(self, bbox: list):
        """Updates the state vector with an observed bounding box [x1, y1, x2, y2]."""
        self.time_since_update = 0
        self.history = []
        self.hits += 1
        self.hit_streak += 1

        z = self.convert_bbox_to_z(bbox)
        # y = z - H * x
        y = z - np.dot(self.H, self.x)
        # S = H * P * H^T + R
        S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R
        # K = P * H^T * S^-1
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))
        # x = x + K * y
        self.x = self.x + np.dot(K, y)
        # P = (I - K * H) * P
        I = np.eye(self.dim_x, dtype=np.float32)
        self.P = np.dot(I - np.dot(K, self.H), self.P)

    def get_state(self) -> list:
        """Returns the current bounding box estimate."""
        return self.convert_x_to_bbox(self.x)
