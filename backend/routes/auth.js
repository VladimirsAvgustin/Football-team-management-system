const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const emailUser = process.env.EMAIL_USER || 'vladimiravgustin123@gmail.com';
const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const MAX_IMAGE_DATA_LENGTH = 3_200_000;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_MIN_LENGTH_ERROR = `Parolei j\u0101b\u016bt vismaz ${MIN_PASSWORD_LENGTH} rakstz\u012bmes garai`;

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

const normalizeImageData = (value) => (typeof value === 'string' ? value.trim() : '');
const isSupportedImageDataUrl = (value) => /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value);
const isValidImagePayload = (value) => Boolean(value) && isSupportedImageDataUrl(value) && value.length <= MAX_IMAGE_DATA_LENGTH;
const normalizeBaseUrl = (value) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '');
const getOriginFromHeader = (value) => {
  try {
    const parsedUrl = new URL(value);
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.origin : '';
  } catch {
    return '';
  }
};
const getFrontendBaseUrl = (req) => {
  const configuredUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  const requestOrigin = getOriginFromHeader(req.get('origin'));
  if (requestOrigin) {
    return requestOrigin;
  }

  const refererOrigin = getOriginFromHeader(req.get('referer'));
  return refererOrigin || 'http://localhost:5173';
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorizācijas tokens nav norādīts' });
  }

  const token = authHeader.split(' ')[1];


  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, surname, role }
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(403).json({ error: 'Nederīgs autorizācijas tokens' });
  }
};

// Shared helper for auth/store usage.
async function getMyTeam(token) {
  const res = await fetch('/my-team', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.team.id;
}

module.exports = (db) => {
    const router = express.Router();
    const normalizeRole = (role) => (typeof role === 'string' ? role.trim().toLowerCase() : '');
    const createHttpError = (status, message) => {
      const error = new Error(message);
      error.status = status;
      return error;
    };
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function runCallback(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
    const formatDisplayName = (name, surname, fallback = 'Treneris') => {
      const fullName = [name, surname]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
        .join(' ');

      return fullName || fallback;
    };
    const getUserProfile = (userId) => dbGet(
      'SELECT id, name, surname, email, role, team_id, avatar FROM users WHERE id = ?',
      [userId]
    );
    const getTeamById = (teamId) => dbGet('SELECT * FROM teams WHERE id = ?', [teamId]);
    const getManagedTeamMembership = async (userId, teamId) => {
      const user = await getUserProfile(userId);

      if (!user || normalizeRole(user.role) !== 'coach') {
        return null;
      }

      return Number(user.team_id) === Number(teamId) ? user : null;
    };
    const getOwnedTeam = async (userId, teamId) => {
      const team = await getTeamById(teamId);
      return team && Number(team.coach_id) === Number(userId) ? team : null;
    };
    const ensureTeamChatRoom = async (teamId, teamName) => {
      const existingRoom = await dbGet('SELECT id FROM chat_rooms WHERE team_id = ?', [teamId]);

      if (!existingRoom) {
        await dbRun(
          'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
          [teamId, `${teamName} čats`]
        );
      }
    };
    const leaveCurrentTeam = async (userId) => {
      const user = await getUserProfile(userId);

      if (!user) {
        throw createHttpError(404, 'Lietotājs nav atrasts');
      }

      const teamId = Number(user.team_id) || null;

      if (!teamId) {
        throw createHttpError(400, 'You are not part of a team');
      }

      const team = await getTeamById(teamId);

      // Recover gracefully if the membership points to a missing team row.
      if (!team) {
        await dbRun('UPDATE users SET team_id = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
        return {
          user: await getUserProfile(userId),
          team: null,
          ownershipTransferred: false,
          successor: null
        };
      }

      const isCoach = normalizeRole(user.role) === 'coach';
      const isTeamOwner = isCoach && Number(team.coach_id) === Number(userId);
      let successor = null;

      if (isTeamOwner) {
        successor = await dbGet(
          `SELECT id, name, surname
           FROM users
           WHERE team_id = ? AND id != ? AND LOWER(role) = 'coach'
           ORDER BY datetime(createdAt) ASC, id ASC
           LIMIT 1`,
          [teamId, userId]
        );

        if (!successor) {
          throw createHttpError(
            409,
            'The main coach cannot leave the team until another coach joins to take over.'
          );
        }
      }

      await dbRun('BEGIN TRANSACTION');

      try {
        if (successor) {
          await dbRun(
            'UPDATE teams SET coach_id = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [successor.id, teamId]
          );
        }

        await dbRun(
          'UPDATE users SET team_id = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          [userId]
        );

        await dbRun('COMMIT');
      } catch (error) {
        try {
          await dbRun('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error while leaving team:', rollbackError);
        }
        throw error;
      }

      return {
        user: await getUserProfile(userId),
        team,
        ownershipTransferred: Boolean(successor),
        successor
      };
    };
    router.post('/register', async (req, res) => {
        const { name, surname, email, password, role, teamCode, createTeam, teamName } = req.body;
      
        if (!name || !surname || !email || !password) {
          return res.status(400).json({ error: 'Lūdzu, aizpildiet visus laukus.' });
        }
      
        if (String(password).length < MIN_PASSWORD_LENGTH) {
          return res.status(400).json({ error: PASSWORD_MIN_LENGTH_ERROR });
        }

        const userRole = role || 'user';
      
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Servera kļūda' });
          }
      
          if (row) {
            return res.status(400).json({ error: 'Lietotājs ar šo e-pastu jau pastāv' });
          }
      
          try {
            const hashedPassword = await bcrypt.hash(password, 10);
      
            const insertUser = (team_id = null) => {
              db.run(
                'INSERT INTO users (name, surname, role, email, password, team_id) VALUES (?, ?, ?, ?, ?, ?)',
                [name, surname, userRole, email, hashedPassword, team_id],
                function (insertErr) {
                  if (insertErr) {
                    console.error(insertErr.message);
                    return res.status(500).json({ error: 'Reģistrācijas kļūda' });
                  }
      
                  const userId = this.lastID;
      
                  if (userRole.toLowerCase() === 'player') {
                    db.run(
                      'INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards) VALUES (?, 0, 0, 0, 0, 0)',
                      [userId],
                      (statsErr) => {
                        if (statsErr) {
                          console.error('Error adding player stats:', statsErr.message);
                        }
                        res.status(201).json({ message: 'Lietotājs veiksmīgi reģistrēts', userId });
                      }
                    );
                  } else {
                    res.status(201).json({ message: 'Lietotājs veiksmīgi reģistrēts', userId });
                  }
                }
              );
            };
      
            if (createTeam && userRole.toLowerCase() === 'coach') {
              if (!teamName || !teamCode) {
                return res.status(400).json({ error: 'Lai izveidotu komandu, jānorāda komandas nosaukums un kods.' });
              }
      
                // Temporarily insert the user without team_id.
              db.run(
                'INSERT INTO users (name, surname, role, email, password) VALUES (?, ?, ?, ?, ?)',
                [name, surname, userRole, email, hashedPassword],
                function (userInsertErr) {
                  if (userInsertErr) {
                    console.error(userInsertErr.message);
                    return res.status(500).json({ error: 'Kļūda, reģistrējot treneri' });
                  }
      
                  const coachId = this.lastID;
      
                  db.run(
                    'INSERT INTO teams (name, team_code, coach_id) VALUES (?, ?, ?)',
                    [teamName, teamCode, coachId],
                    function (teamInsertErr) {
                      if (teamInsertErr) {
                        console.error(teamInsertErr.message);
                        return res.status(500).json({ error: 'Kļūda, izveidojot komandu' });
                      }
      
                      const teamId = this.lastID;
      
                      // Create team chat room automatically
                      db.run(
                        'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
                        [teamId, `${teamName} čats`],
                        (chatErr) => {
                          if (chatErr) {
                            console.error('Error creating team chat room:', chatErr.message);
                          } else {
                            console.log(`Komandas čata istaba izveidota komandai: ${teamName}`);
                          }
                        }
                      );

                        // Update user.team_id.
                      db.run(
                        'UPDATE users SET team_id = ? WHERE id = ?',
                        [teamId, coachId],
                        (updateErr) => {
                          if (updateErr) {
                            console.error(updateErr.message);
                          return res.status(500).json({ error: 'Kļūda, piesaistot lietotāju komandai' });
                          }
      
                          res.status(201).json({
                        message: 'Treneris un komanda veiksmīgi reģistrēti',
                            coachId,
                            team_id: teamId
                          });
                        }
                      );
                    }
                  );
                }
              );
            } else if (teamCode) {
              if (userRole.toLowerCase() === 'coach') {
                return res.status(400).json({
                  error: 'Treneriem vispirms jāreģistrējas un pēc tam lietotnē jānosūta pievienošanās pieprasījums.'
                });
              }

              db.get('SELECT id FROM teams WHERE team_code = ?', [teamCode], (teamErr, teamRow) => {
                if (teamErr) {
                  console.error(teamErr.message);
                return res.status(500).json({ error: 'Kļūda, meklējot komandu' });
                }
      
                const team_id = teamRow ? teamRow.id : null;
                insertUser(team_id);
              });
            } else {
              insertUser(null);
            }
      
          } catch (hashError) {
            console.error(hashError.message);
            res.status(500).json({ error: 'Paroles apstrādes kļūda' });
          }
        });
      });
      

  
  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login request:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Ievadiet e-pastu un paroli' });
    }
  
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Login database error:', err.stack || err.message || err);
        return res.status(500).json({ error: 'Servera kļūda' });
      }
  
      if (!user) {
        console.log('Login user not found:', email);
        return res.status(400).json({ error: 'Lietotājs nav atrasts' });
      }
  
      try {
        if (!user.password) {
          console.error('Login user has no password hash:', email);
          return res.status(500).json({ error: 'Paroles pārbaudes kļūda' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          console.log('Login invalid password:', email);
          return res.status(400).json({ error: 'Nepareiza parole' });
        }
  
        // === GENERATE TOKEN ===
        const token = jwt.sign(
          { id: user.id, name: user.name, surname: user.surname, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
  
        res.status(200).json({ 
          message: 'Pieslēgšanās veiksmīga', 
          user: { id: user.id, name: user.name, surname: user.surname, role: user.role },
          token
        });
  
      } catch (compareError) {
        console.error('Login password check error:', compareError.stack || compareError.message || compareError);
        res.status(500).json({ error: 'Paroles pārbaudes kļūda' });
      }
    });
  });

  router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'E-pasts ir obligāts' });
    }

    db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        console.error('Forgot password lookup error:', err.message);
        return res.status(500).json({ error: 'Servera kļūda' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Konts ar šo e-pastu nav atrasts.' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
      const frontendBaseUrl = getFrontendBaseUrl(req);
      const resetLink = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

      db.serialize(() => {
        db.run('DELETE FROM password_resets WHERE user_id = ? OR expires_at <= strftime(\'%s\', \'now\')', [user.id]);
        db.run(
          'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
          [user.id, tokenHash, expiresAt],
          async (insertErr) => {
            if (insertErr) {
              console.error('Forgot password token insert error:', insertErr.message);
              return res.status(500).json({ error: 'Servera kļūda' });
            }

            const mailOptions = {
                from: `"TeamFlow" <${emailUser}>`,
                to: user.email,
                subject: 'Paroles atiestatīšanas pieprasījums',
                html: `
                  <p>Jūs pieprasījāt paroles atiestatīšanu.</p>
                  <p>Noklikšķiniet uz saites zemāk, lai iestatītu jaunu paroli:</p>
                  <p><a href="${resetLink}">${resetLink}</a></p>
                  <p>Šī saite ir derīga 1 stundu.</p>
                  <p>Ja jūs to nepieprasījāt, ignorējiet šo e-pastu.</p>
                `
              };

            res.status(200).json({
              message: 'Paroles atiestatīšanas e-pasts ir nosūtīts. Tas var pienākt līdz 5 minūšu laikā.'
            });

            setImmediate(() => {
              mailTransporter.sendMail(mailOptions).catch((mailErr) => {
                console.error('Forgot password mail error:', mailErr.message);
                if (process.env.NODE_ENV !== 'production') {
                  console.log('Paroles atiestatīšanas saite lokālai testēšanai:', resetLink);
                }
              });
            });
          }
        );
      });
    });
  });

  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Nepieciešams atiestatīšanas tokens un jaunā parole' });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: PASSWORD_MIN_LENGTH_ERROR });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    db.get(
      `SELECT pr.id, pr.user_id
       FROM password_resets pr
       WHERE pr.token_hash = ?
         AND pr.used_at IS NULL
         AND pr.expires_at > strftime('%s', 'now')`,
      [tokenHash],
      async (findErr, resetRow) => {
        if (findErr) {
          console.error('Reset password lookup error:', findErr.message);
          return res.status(500).json({ error: 'Servera kļūda' });
        }

        if (!resetRow) {
          return res.status(400).json({ error: 'Atiestatīšanas tokens nav derīgs vai ir beidzies' });
        }

        try {
          const hashedPassword = await bcrypt.hash(password, 10);

          db.serialize(() => {
            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRow.user_id], (updateErr) => {
              if (updateErr) {
                console.error('Reset password update user error:', updateErr.message);
                return res.status(500).json({ error: 'Servera kļūda' });
              }

              db.run(
                'UPDATE password_resets SET used_at = strftime(\'%s\', \'now\') WHERE id = ?',
                [resetRow.id],
                (markErr) => {
                  if (markErr) {
                    console.error('Reset password mark token error:', markErr.message);
                    return res.status(500).json({ error: 'Servera kļūda' });
                  }

                  db.run('DELETE FROM password_resets WHERE user_id = ? AND id != ?', [resetRow.user_id, resetRow.id]);
                  return res.status(200).json({ message: 'Parole veiksmīgi atiestatīta' });
                }
              );
            });
          });
        } catch (hashErr) {
          console.error('Reset password hash error:', hashErr.message);
          return res.status(500).json({ error: 'Servera kļūda' });
        }
      }
    );
  });
  
      
  router.get('/me', (req, res) => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Autorizācijas tokens nav norādīts' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // decoded = { id: ..., name: ..., surname: ..., role: ... }

            // Fetch fresh profile fields from database for up-to-date info
            db.get('SELECT name, surname, email, avatar, team_id, createdAt AS created_at FROM users WHERE id = ?', [decoded.id], (err, row) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Kļūda, ielādējot lietotāja datus' });
              }
              res.status(200).json({ 
                user: { 
                  id: decoded.id,
                  name: row?.name || decoded.name,
                  surname: row?.surname || decoded.surname,
                  email: row?.email || null,
                  avatar: row?.avatar || null,
                  role: decoded.role,
                  team_id: row?.team_id || null,
                  created_at: row?.created_at || null
                } 
              });
            });
        } catch (error) {
            console.error(error.message);
            res.status(401).json({ error: 'Nederīgs autorizācijas tokens' });
        }
    });


    router.post('/avatar', authenticateToken, (req, res) => {
      const userId = req.user.id;
      const avatar = normalizeImageData(req.body?.avatar);

      if (!isValidImagePayload(avatar)) {
        return res.status(400).json({ error: 'Nederīgs profila attēls' });
      }

      db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId], function (err) {
        if (err) {
          console.error('Error saving user avatar:', err.message);
          return res.status(500).json({ error: 'Neizdevās saglabāt profila attēlu' });
        }

        return res.status(200).json({ message: 'Profila attēls veiksmīgi augšupielādēts', avatar });
      });
    });

    router.delete('/avatar', authenticateToken, (req, res) => {
      const userId = req.user.id;

      db.run('UPDATE users SET avatar = NULL WHERE id = ?', [userId], function (err) {
        if (err) {
          console.error('Error deleting user avatar:', err.message);
          return res.status(500).json({ error: 'Neizdevās dzēst profila attēlu' });
        }

        return res.status(200).json({ message: 'Profila attēls veiksmīgi dzēsts' });
      });
    });

    router.post('/players/:id/avatar', authenticateToken, (req, res) => {
      const playerId = req.params.id;
      const coachId = req.user.id;
      const avatar = normalizeImageData(req.body?.avatar);

      if (!isValidImagePayload(avatar)) {
        return res.status(400).json({ error: 'Nederīgs profila attēls' });
      }

      db.get('SELECT team_id, role FROM users WHERE id = ?', [coachId], (coachErr, coach) => {
        if (coachErr) {
          console.error('Error fetching coach for avatar upload:', coachErr.message);
          return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!coach || String(coach.role || '').toLowerCase() !== 'coach' || !coach.team_id) {
          return res.status(403).json({ error: 'Spēlētāju profila attēlus var atjaunināt tikai šīs komandas treneris' });
        }

        db.get('SELECT id, team_id, role FROM users WHERE id = ?', [playerId], (playerErr, player) => {
          if (playerErr) {
            console.error('Error fetching player for avatar upload:', playerErr.message);
            return res.status(500).json({ error: 'Datubāzes kļūda' });
          }

          if (!player || player.team_id !== coach.team_id || String(player.role || '').toLowerCase() !== 'player') {
            return res.status(404).json({ error: 'Spēlētājs jūsu komandā nav atrasts' });
          }

          db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, playerId], function (updateErr) {
            if (updateErr) {
              console.error('Error saving player avatar:', updateErr.message);
              return res.status(500).json({ error: 'Neizdevās saglabāt profila attēlu' });
            }

            return res.status(200).json({ message: 'Spēlētāja profila attēls veiksmīgi augšupielādēts', avatar });
          });
        });
      });
    });

    router.delete('/players/:id/avatar', authenticateToken, (req, res) => {
      const playerId = req.params.id;
      const coachId = req.user.id;

      db.get('SELECT team_id, role FROM users WHERE id = ?', [coachId], (coachErr, coach) => {
        if (coachErr) {
          console.error('Error fetching coach for avatar delete:', coachErr.message);
          return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!coach || String(coach.role || '').toLowerCase() !== 'coach' || !coach.team_id) {
          return res.status(403).json({ error: 'Spēlētāju profila attēlus var atjaunināt tikai šīs komandas treneris' });
        }

        db.get('SELECT id, team_id, role FROM users WHERE id = ?', [playerId], (playerErr, player) => {
          if (playerErr) {
            console.error('Error fetching player for avatar delete:', playerErr.message);
            return res.status(500).json({ error: 'Datubāzes kļūda' });
          }

          if (!player || player.team_id !== coach.team_id || String(player.role || '').toLowerCase() !== 'player') {
            return res.status(404).json({ error: 'Spēlētājs jūsu komandā nav atrasts' });
          }

          db.run('UPDATE users SET avatar = NULL WHERE id = ?', [playerId], function (updateErr) {
            if (updateErr) {
              console.error('Error deleting player avatar:', updateErr.message);
              return res.status(500).json({ error: 'Neizdevās dzēst profila attēlu' });
            }

            return res.status(200).json({ message: 'Spēlētāja profila attēls veiksmīgi dzēsts' });
          });
        });
      });
    });


    router.post(
      '/teams',
      authenticateToken,            // Verify token.
      (req, res) => {
        const coachId = req.user.id;    // Read from token.
        const { name, teamCode } = req.body;
  
        if (!name || !teamCode) {
          return res
            .status(400)
                .json({ error: 'Lūdzu, aizpildiet visus komandas laukus' });
        }
  
        // 1) Insert the new team.
        db.run(
          `INSERT INTO teams (name, team_code, coach_id) VALUES (?, ?, ?)`,
          [name, teamCode, coachId],
          function (err) {
            if (err) {
              console.error('Error creating team:', err.message);
              return res
                .status(500)
                .json({ error: 'Kļūda, izveidojot komandu' });
            }
  
            const newTeamId = this.lastID;
  
            // Create team chat room automatically
            db.run(
              'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
              [newTeamId, `${name} čats`],
              (chatErr) => {
                if (chatErr) {
                  console.error('Error creating team chat room:', chatErr.message);
                } else {
                  console.log(`Komandas čata istaba izveidota komandai: ${name}`);
                }
              }
            );

            // 2) Update the user by assigning team_id.
            db.run(
              `UPDATE users SET team_id = ? WHERE id = ?`,
              [newTeamId, coachId],
              function (updErr) {
                if (updErr) {
                  console.error(
                    'Error updating user with team ID:',
                    updErr.message
                  );
                  // The team was created, but linking it to the coach failed.
                  return res
                    .status(500)
                    .json({
                      error:
                        'Komanda izveidota, bet neizdevās to piesaistīt trenerim',
                    });
                }
  
                // Return the new team and updated user.
                return res.status(201).json({
                  message: 'Komanda veiksmīgi izveidota',
                  team: {
                    id: newTeamId,
                    name,
                    teamCode,
                    coachId,
                  },
                });
              }
            );
          }
        );
      }
    );
  

router.get('/teams/:id/players', (req, res) => {
    const team_id = req.params.id;

    db.all('SELECT id, name, surname, (name || \' \' || surname) as username, email, role, avatar FROM users WHERE team_id = ?', [team_id], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Kļūda, ielādējot spēlētājus' });
        }

        res.status(200).json({ players: rows });
    });
});

// Get team by coach_id
router.get('/teams/byCoach/:coachId', (req, res) => {
  const coachId = req.params.coachId;

  db.get('SELECT * FROM teams WHERE coach_id = ?', [coachId], (err, team) => {
      if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Kļūda, meklējot komandu' });
      }

      if (!team) {
          return res.status(404).json({ message: 'Komanda nav atrasta' });
      }

      res.status(200).json({ team });
  });
});


router.get('/teams/:teamId', async (req, res) => {
    const teamId = req.params.teamId;
  
    // SQLite example without ORM.
    db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, team) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Kļūda, ielādējot komandu' });
      }
  
      if (!team) {
        return res.status(404).json({ error: 'Komanda nav atrasta' });
      }
  
      db.all('SELECT id, name, surname, email, role, team_id, avatar FROM users WHERE team_id = ?', [teamId], (err2, players) => {
        if (err2) {
          console.error(err2.message);
          return res.status(500).json({ error: 'Kļūda, ielādējot spēlētājus' });
        }
  
        res.status(200).json({ team, players });
      });
    });
  });
  
  router.get('/my-team', authenticateToken, (req, res) => {
    const userId = req.user.id;
  
    if (!userId) {
      return res.status(400).json({ error: 'Lietotāja ID nav norādīts' });
    }
  
    db.get('SELECT team_id FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error('Datubāzes kļūda, ielādējot lietotāju:', err.message);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }
  
      if (!row || !row.team_id) {
        return res.status(404).json({ message: 'Lietotājam nav komandas' });
      }
  
      const teamId = row.team_id;
  
      db.get('SELECT * FROM teams WHERE id = ?', [teamId], (teamErr, team) => {
        if (teamErr) {
          console.error('Error fetching team:', teamErr.message);
          return res.status(500).json({ error: 'Kļūda, ielādējot komandu' });
        }
  
        if (!team) {
          return res.status(404).json({ message: 'Komanda nav atrasta' });
        }
  
        res.status(200).json({ team });
      });
    });
  });

  router.get('/players/:id/stats', (req, res) => {
  const playerId = req.params.id;

  db.get(
    'SELECT * FROM player_stats WHERE user_id = ?',
    [playerId],
    (err, stats) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Kļūda, ielādējot spēlētāja statistiku' });
      }

      res.status(200).json({ 
        stats: stats || { 
          matches: 0, 
          goals: 0, 
          assists: 0, 
          yellow_cards: 0, 
          red_cards: 0 
        } 
      });
    }
  );
});

// Update player statistics.
router.put('/players/:id/stats', authenticateToken, (req, res) => {
  const playerId = req.params.id;
  const { matches, goals, assists, yellow_cards, red_cards } = req.body;

  (async () => {
    try {
      const coach = await getUserProfile(req.user.id);

      if (!coach || normalizeRole(coach.role) !== 'coach' || !coach.team_id) {
        return res.status(403).json({ error: 'Spēlētāju statistiku var atjaunināt tikai komandas treneri' });
      }

      const player = await dbGet('SELECT team_id, role FROM users WHERE id = ?', [playerId]);

      if (!player || Number(player.team_id) !== Number(coach.team_id) || normalizeRole(player.role) !== 'player') {
        return res.status(403).json({ error: 'Nav atļauts atjaunināt šo spēlētāju' });
      }

      await dbRun(
        `INSERT INTO player_stats
         (user_id, matches, goals, assists, yellow_cards, red_cards)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           matches = excluded.matches,
           goals = excluded.goals,
           assists = excluded.assists,
           yellow_cards = excluded.yellow_cards,
           red_cards = excluded.red_cards`,
        [playerId, matches, goals, assists, yellow_cards, red_cards]
      );

      return res.status(200).json({ message: 'Statistika veiksmīgi atjaunināta' });
    } catch (err) {
      console.error('Error updating player stats:', err.message);
      return res.status(500).json({ error: 'Kļūda, atjauninot statistiku' });
    }
  })();
  return;

  // Verify that the user is the team coach.
  db.get(
    'SELECT team_id FROM users WHERE id = ?',
    [req.user.id],
    (err, coach) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Kļūda, pārbaudot treneri' });
      }

      db.get(
        'SELECT team_id FROM users WHERE id = ?',
        [playerId],
        (err, player) => {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Kļūda, pārbaudot spēlētāju' });
          }

          // Verify that the coach and player belong to the same team.
          if (coach.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Nav atļauts atjaunināt šo spēlētāju' });
          }

          // Update or create statistics.
          db.run(
            `INSERT INTO player_stats 
             (user_id, matches, goals, assists, yellow_cards, red_cards) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               matches = excluded.matches,
               goals = excluded.goals,
               assists = excluded.assists,
               yellow_cards = excluded.yellow_cards,
               red_cards = excluded.red_cards`,
            [playerId, matches, goals, assists, yellow_cards, red_cards],
            function (err) {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Kļūda, atjauninot statistiku' });
              }

              res.status(200).json({ message: 'Statistika veiksmīgi atjaunināta' });
            }
          );
        }
      );
    }
  );
});


router.post('/join-team', authenticateToken, async (req, res) => {
  const { teamCode } = req.body;
  const userId = req.user.id;
  (async () => {
    try {
      const normalizedTeamCode = typeof teamCode === 'string' ? teamCode.trim().toUpperCase() : '';

      if (!normalizedTeamCode) {
        return res.status(400).json({ message: 'Komandas kods ir obligāts' });
      }

      const user = await getUserProfile(userId);

      if (!user) {
        return res.status(404).json({ message: 'Lietotājs nav atrasts' });
      }

      if (user.team_id) {
        return res.status(400).json({ message: 'Lietotājs jau ir komandā' });
      }

      const team = await dbGet('SELECT id, name, coach_id FROM teams WHERE team_code = ?', [normalizedTeamCode]);

      if (!team) {
        return res.status(404).json({ message: 'Komanda ar šo kodu nav atrasta' });
      }

      if (normalizeRole(user.role) === 'coach') {
        const ownedTeam = await dbGet('SELECT id FROM teams WHERE coach_id = ?', [userId]);

        if (ownedTeam) {
        return res.status(409).json({ message: 'Galvenie treneri nevar pievienoties citai komandai kā trenera asistenti.' });
        }

        const pendingRequest = await dbGet(
          `SELECT cjr.id, cjr.team_id, t.name AS team_name
           FROM coach_join_requests cjr
           JOIN teams t ON t.id = cjr.team_id
           WHERE cjr.requester_user_id = ? AND cjr.status = 'pending'
           ORDER BY cjr.id DESC
           LIMIT 1`,
          [userId]
        );

        if (pendingRequest) {
          if (Number(pendingRequest.team_id) === Number(team.id)) {
        return res.status(409).json({ message: 'Jūsu trenera asistenta pieprasījums šai komandai jau gaida apstiprinājumu.' });
          }

          return res.status(409).json({
          message: `Jums jau ir trenera asistenta pieprasījums komandai ${pendingRequest.team_name}.`
          });
        }

        await dbRun(
          `INSERT INTO coach_join_requests (team_id, requester_user_id, status)
           VALUES (?, ?, 'pending')`,
          [team.id, userId]
        );

        return res.status(202).json({
        message: 'Trenera asistenta pieprasījums nosūtīts galvenajam trenerim.',
          requestCreated: true
        });
      }

      await dbRun('UPDATE users SET team_id = ? WHERE id = ?', [team.id, userId]);
      await ensureTeamChatRoom(team.id, team.name);

      if (normalizeRole(user.role) === 'player') {
        await dbRun(
          `INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards, attendance)
           VALUES (?, 0, 0, 0, 0, 0, 0)
           ON CONFLICT(user_id) DO UPDATE SET
             matches = 0,
             goals = 0,
             assists = 0,
             yellow_cards = 0,
             red_cards = 0,
             attendance = 0`,
          [userId]
        );
      }

      const updatedUser = await getUserProfile(userId);

      return res.status(200).json({
        message: 'Jūs veiksmīgi pievienojāties komandai',
        user: updatedUser,
        team: {
          id: team.id,
          name: team.name,
          coach_id: team.coach_id
        }
      });
    } catch (err) {
      console.error('Error joining team:', err);
      return res.status(500).json({ message: 'Iekšēja servera kļūda', error: err.message });
    }
  })();
  return;

  // Verify that the user is not already on a team.
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT team_id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user && user.team_id) {
      return res.status(400).json({ message: 'Lietotājs jau ir komandā' });
    }

    // Find the team by code.
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, coach_id FROM teams WHERE team_code = ?', [teamCode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!team) {
      return res.status(404).json({ message: 'Komanda ar šo kodu nav atrasta' });
    }

    // Update the user by adding team_id.
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET team_id = ? WHERE id = ?',
        [team.id, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Create a team chat room if it does not exist yet.
    const existingRoom = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM chat_rooms WHERE team_id = ?', [team.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingRoom) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO chat_rooms (team_id, name) VALUES (?, ?)',
          [team.id, `${team.name} čats`],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Create statistics for player accounts.
    const userRole = await new Promise((resolve, reject) => {
      db.get('SELECT role FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row?.role);
      });
    });

    if (userRole && userRole.toLowerCase() === 'player') {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO player_stats (user_id, matches, goals, assists, yellow_cards, red_cards, attendance) 
           VALUES (?, 0, 0, 0, 0, 0, 0)
           ON CONFLICT(user_id) DO UPDATE SET
             matches = 0, goals = 0, assists = 0, yellow_cards = 0, red_cards = 0, attendance = 0`,
          [userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Return updated user and team data.
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, surname, email, avatar, role, team_id FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.status(200).json({
      message: 'Jūs veiksmīgi pievienojāties komandai',
      user: updatedUser,
      team: {
        id: team.id,
        name: team.name,
        coach_id: team.coach_id
      }
    });

  } catch (err) {
    console.error('Error joining team:', err);
    res.status(500).json({ message: 'Iekšēja servera kļūda', error: err.message });
  }
});

router.get('/teams/:teamId/coach-requests', authenticateToken, async (req, res) => {
  const { teamId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Trenera asistentu pieprasījumus var pārskatīt tikai galvenais treneris' });
    }

    const requests = await dbAll(
      `SELECT
         cjr.id,
         cjr.team_id,
         cjr.requester_user_id,
         cjr.status,
         cjr.created_at,
         u.name,
         u.surname,
         u.email,
         u.avatar
       FROM coach_join_requests cjr
       JOIN users u ON u.id = cjr.requester_user_id
       WHERE cjr.team_id = ? AND cjr.status = 'pending'
       ORDER BY datetime(cjr.created_at) ASC, cjr.id ASC`,
      [teamId]
    );

    res.status(200).json({ requests });
  } catch (error) {
    console.error('Error loading coach join requests:', error);
    res.status(500).json({ error: 'Neizdevās ielādēt treneru pievienošanās pieprasījumus' });
  }
});

router.post('/teams/:teamId/coach-requests/:requestId/approve', authenticateToken, async (req, res) => {
  const { teamId, requestId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Trenera asistentu pieprasījumus var apstiprināt tikai galvenais treneris' });
    }

    const request = await dbGet(
      `SELECT id, team_id, requester_user_id, status
       FROM coach_join_requests
       WHERE id = ? AND team_id = ?`,
      [requestId, teamId]
    );

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Gaidošs trenera pieprasījums nav atrasts' });
    }

    const requester = await getUserProfile(request.requester_user_id);

    if (!requester || normalizeRole(requester.role) !== 'coach') {
      return res.status(400).json({ error: 'Kā asistenti var tikt apstiprināti tikai treneru konti' });
    }

    if (requester.team_id) {
      return res.status(409).json({ error: 'Šis treneris jau ir komandā' });
    }

    const requesterOwnedTeam = await dbGet('SELECT id FROM teams WHERE coach_id = ?', [request.requester_user_id]);

    if (requesterOwnedTeam) {
      return res.status(409).json({ error: 'Galvenais treneris nevar vienlaikus pievienoties citai komandai kā asistents' });
    }

    await dbRun('UPDATE users SET team_id = ? WHERE id = ?', [teamId, request.requester_user_id]);
    await ensureTeamChatRoom(teamId, ownedTeam.name);
    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'approved',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, requestId]
    );
    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE requester_user_id = ? AND status = 'pending' AND id != ?`,
      [req.user.id, request.requester_user_id, requestId]
    );

    res.status(200).json({ message: 'Trenera asistents veiksmīgi apstiprināts' });
  } catch (error) {
    console.error('Error approving coach request:', error);
    res.status(500).json({ error: 'Neizdevās apstiprināt trenera pieprasījumu' });
  }
});

router.post('/teams/:teamId/coach-requests/:requestId/reject', authenticateToken, async (req, res) => {
  const { teamId, requestId } = req.params;

  try {
    const ownedTeam = await getOwnedTeam(req.user.id, teamId);

    if (!ownedTeam) {
      return res.status(403).json({ error: 'Trenera asistentu pieprasījumus var noraidīt tikai galvenais treneris' });
    }

    const request = await dbGet(
      `SELECT id, status
       FROM coach_join_requests
       WHERE id = ? AND team_id = ?`,
      [requestId, teamId]
    );

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ error: 'Gaidošs trenera pieprasījums nav atrasts' });
    }

    await dbRun(
      `UPDATE coach_join_requests
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, requestId]
    );

    res.status(200).json({ message: 'Trenera asistenta pieprasījums noraidīts' });
  } catch (error) {
    console.error('Error rejecting coach request:', error);
    res.status(500).json({ error: 'Neizdevās noraidīt trenera pieprasījumu' });
  }
});

router.post('/leave-team', authenticateToken, async (req, res) => {
  try {
    const result = await leaveCurrentTeam(req.user.id);
    const successorName = result.successor
      ? `${result.successor.name || ''} ${result.successor.surname || ''}`.trim()
      : '';

    const message = result.ownershipTransferred
      ? `Jūs pametāt komandu ${result.team?.name || ''}. Komandas īpašumtiesības nodotas lietotājam ${successorName}.`
      : `Jūs veiksmīgi pametāt komandu ${result.team?.name || ''}.`;

    return res.status(200).json({
      message,
      user: result.user,
      successor: result.successor
    });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Error leaving team:', error);
    return res.status(500).json({ error: 'Neizdevās pamest komandu' });
  }
});

router.delete('/players/:id/team', authenticateToken, async (req, res) => {
  const playerId = req.params.id;
  const coachId = req.user.id;

  (async () => {
    try {
      const ownerTeam = await dbGet('SELECT id, name FROM teams WHERE coach_id = ?', [coachId]);

      if (!ownerTeam) {
        return res.status(403).json({ error: 'Spēlētājus var noņemt tikai galvenais treneris' });
      }

      const player = await dbGet('SELECT id, role FROM users WHERE id = ? AND team_id = ?', [playerId, ownerTeam.id]);

      if (!player || normalizeRole(player.role) !== 'player') {
        return res.status(404).json({ error: 'Spēlētājs jūsu komandā nav atrasts' });
      }

      await dbRun('UPDATE users SET team_id = NULL WHERE id = ?', [playerId]);
      return res.status(200).json({ message: 'Spēlētājs noņemts no komandas' });
    } catch (err) {
      console.error('Error removing player from team:', err);
      return res.status(500).json({ error: 'Servera kļūda' });
    }
  })();
  return;

  try {
    // Verify that the request comes from the team coach.
    const team = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM teams WHERE coach_id = ?', [coachId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!team) {
      return res.status(403).json({ error: 'Spēlētājus var noņemt tikai komandas treneris' });
    }

    // Verify that the player belongs to the coach's team.
    const player = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ? AND team_id = ?', [playerId, team.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!player) {
      return res.status(404).json({ error: 'Spēlētājs jūsu komandā nav atrasts' });
    }

    // Remove the player from the team.
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET team_id = NULL WHERE id = ?', [playerId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({ message: 'Spēlētājs noņemts no komandas' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Servera kļūda' });
  }
});

// Get user statistics for homepage dashboard
router.get('/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let teamCount = 0;
    let upcomingEvents = 0;
    let playerCount = 0;

    const normalizedRole = normalizeRole(userRole);
    const user = await getUserProfile(userId);
    const userTeamId = Number(user?.team_id) || null;

    if (normalizedRole === 'coach') {
      if (!userTeamId) {
        return res.json({ teamCount: 0, upcomingEvents: 0, playerCount: 0 });
      }

      const [eventResult, playerResult] = await Promise.all([
        dbGet(
          `SELECT COUNT(*) as count FROM schedules
           WHERE team_id = ? AND date(event_date) >= date('now')`,
          [userTeamId]
        ),
        dbGet(
          `SELECT COUNT(*) as count FROM users
           WHERE team_id = ? AND role = 'Player'`,
          [userTeamId]
        )
      ]);

      return res.json({
        teamCount: 1,
        upcomingEvents: eventResult ? eventResult.count : 0,
        playerCount: playerResult ? playerResult.count : 0
      });
    }

    if (userRole.toLowerCase() === 'coach') {
      // Get teams coached by this user
      db.get(
        'SELECT COUNT(*) as count FROM teams WHERE coach_id = ?',
        [userId],
        (err, result) => {
          if (err) {
            console.error('Error fetching team count:', err);
            return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
          }
          
          teamCount = result ? result.count : 0;
          
          // Get upcoming events for coach's teams
          db.get(
            `SELECT COUNT(*) as count FROM schedules 
             WHERE team_id IN (SELECT id FROM teams WHERE coach_id = ?) 
             AND date(event_date) >= date('now')`,
            [userId],
            (err, eventResult) => {
              if (err) {
                console.error('Error fetching events count:', err);
                return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
              }
              
              upcomingEvents = eventResult ? eventResult.count : 0;
              
              // Get player count in coach's teams
              db.get(
                `SELECT COUNT(*) as count FROM users 
                 WHERE team_id IN (SELECT id FROM teams WHERE coach_id = ?) 
                 AND role = 'Player'`,
                [userId],
                (err, playerResult) => {
                  if (err) {
                    console.error('Error fetching player count:', err);
                    return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
                  }
                  
                  playerCount = playerResult ? playerResult.count : 0;
                  
                  res.json({
                    teamCount,
                    upcomingEvents,
                    playerCount
                  });
                }
              );
            }
          );
        }
      );
    } else {
      // For players, show different stats
      db.get(
        'SELECT team_id FROM users WHERE id = ?',
        [userId],
        (err, userResult) => {
          if (err) {
            console.error('Error fetching user team:', err);
            return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
          }
          
          const userTeamId = userResult ? userResult.team_id : null;
          
          if (userTeamId) {
            // Get upcoming events for player's team
            db.get(
              `SELECT COUNT(*) as count FROM schedules 
               WHERE team_id = ? AND date(event_date) >= date('now')`,
              [userTeamId],
              (err, eventResult) => {
                if (err) {
                  console.error('Error fetching events:', err);
                  return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
                }
                
                upcomingEvents = eventResult ? eventResult.count : 0;
                
                // Get team member count
                db.get(
                  'SELECT COUNT(*) as count FROM users WHERE team_id = ?',
                  [userTeamId],
                  (err, teamResult) => {
                    if (err) {
                      console.error('Error fetching team size:', err);
                      return res.status(500).json({ error: 'Kļūda, ielādējot statistiku' });
                    }
                    
                    playerCount = teamResult ? teamResult.count : 0;
                    teamCount = 1; // Player is in one team
                    
                    res.json({
                      teamCount,
                      upcomingEvents,
                      playerCount
                    });
                  }
                );
              }
            );
          } else {
            res.json({
              teamCount: 0,
              upcomingEvents: 0,
              playerCount: 0
            });
          }
        }
      );
    }
  } catch (error) {
    console.error('Error in user stats endpoint:', error);
    res.status(500).json({ error: 'Iekšēja servera kļūda' });
  }
});

// Get upcoming events for user
router.get('/user/upcoming-events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (normalizeRole(userRole) === 'coach') {
      const user = await getUserProfile(userId);
      const teamId = Number(user?.team_id) || null;

      if (!teamId) {
        return res.json([]);
      }

      const events = await dbAll(
        `SELECT s.*, t.name as team_name
         FROM schedules s
         JOIN teams t ON s.team_id = t.id
         WHERE s.team_id = ?
         AND date(s.event_date) >= date('now')
         ORDER BY s.event_date ASC, s.event_time ASC
         LIMIT 5`,
        [teamId]
      );

      return res.json(events.map((event) => ({
        id: event.id,
        title: event.event_name,
        date: event.event_date,
        time: event.event_time,
        location: event.location,
        team: event.team_name,
        type: event.event_type
      })));
    }
    
    let query;
    let params;
    
    if (userRole.toLowerCase() === 'coach') {
      query = `
        SELECT s.*, t.name as team_name 
        FROM schedules s
        JOIN teams t ON s.team_id = t.id
        WHERE t.coach_id = ? 
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, s.event_time ASC
        LIMIT 5`;
      params = [userId];
    } else {
      query = `
        SELECT s.*, t.name as team_name 
        FROM schedules s
        JOIN teams t ON s.team_id = t.id 
        JOIN users u ON u.team_id = t.id
        WHERE u.id = ? 
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, s.event_time ASC
        LIMIT 5`;
      params = [userId];
    }
    
    db.all(query, params, (err, events) => {
      if (err) {
        console.error('Error fetching upcoming events:', err);
        return res.status(500).json({ error: 'Kļūda, ielādējot notikumus' });
      }
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.event_name,
        date: event.event_date,
        time: event.event_time,
        location: event.location,
        team: event.team_name,
        type: event.event_type
      }));
      
      res.json(formattedEvents);
    });
  } catch (error) {
    console.error('Error in upcoming events endpoint:', error);
    res.status(500).json({ error: 'Iekšēja servera kļūda' });
  }
});

// Get recent activity for user
router.get('/user/recent-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let activities = [];

    if (normalizeRole(userRole) === 'coach') {
      const user = await getUserProfile(userId);
      const teamId = Number(user?.team_id) || null;
      const coachDisplayName = formatDisplayName(user?.name, user?.surname);

      if (!teamId) {
        return res.json([]);
      }

      const [eventActivities, teamActivities] = await Promise.all([
        dbAll(
          `SELECT
             'event' as type,
             'created event' as action,
             event_name as description,
             event_date,
             event_time,
             COALESCE(createdAt, event_date) as timestamp,
             'System' as user_name
            FROM schedules
            WHERE team_id = ?
            AND date(event_date) >= date('now')
            ORDER BY event_date ASC, time(COALESCE(NULLIF(event_time, ''), '23:59:59')) ASC
            LIMIT 5`,
          [teamId]
        ),
        dbAll(
          `SELECT
             'team' as type,
             'joined team' as action,
             t.name as description,
             u.createdAt as timestamp,
             (u.name || ' ' || u.surname) as user_name
           FROM users u
           JOIN teams t ON u.team_id = t.id
           WHERE u.team_id = ? AND u.role = 'Player'
           ORDER BY u.id DESC
           LIMIT 3`,
          [teamId]
        )
      ]);

      activities = [
        ...eventActivities.map((activity) => ({
          ...activity,
          user_name: coachDisplayName
        })),
        ...teamActivities
      ]
        .sort(compareRecentActivityItems)
        .slice(0, 5)
        .map((activity, index) => ({
          id: index + 1,
          type: activity.type,
          user: activity.user_name,
          action: `${activity.action}: ${activity.description}`,
          time: formatTimeAgo(activity.timestamp)
        }));

      return res.json(activities);
    }
    
    if (userRole.toLowerCase() === 'coach') {
      // Get recent activities from coach's teams
      db.all(`
        SELECT 
          'event' as type,
          'created event' as action,
          event_name as description,
          s.event_date,
          s.event_time,
          COALESCE(s.createdAt, s.event_date) as timestamp,
          COALESCE(NULLIF(TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, '')), ''), 'Treneris') as user_name
        FROM schedules s
        JOIN teams t ON s.team_id = t.id
        LEFT JOIN users coach ON coach.id = t.coach_id
        WHERE t.coach_id = ?
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, time(COALESCE(NULLIF(s.event_time, ''), '23:59:59')) ASC
        LIMIT 5
      `, [userId], (err, eventActivities) => {
        if (err) {
          console.error('Error fetching activities:', err);
          return res.status(500).json({ error: 'Kļūda, ielādējot aktivitātes' });
        }
        
        // Get new team members
        db.all(`
          SELECT 
            'team' as type,
            'joined team' as action,
            t.name as description,
            u.id as timestamp,
            (u.name || ' ' || u.surname) as user_name
          FROM users u
          JOIN teams t ON u.team_id = t.id
          WHERE t.coach_id = ? AND u.role = 'Player'
          ORDER BY u.id DESC
          LIMIT 3
        `, [userId], (err, teamActivities) => {
          if (err) {
            console.error('Error fetching team activities:', err);
            return res.status(500).json({ error: 'Kļūda, ielādējot aktivitātes' });
          }
          
          activities = [...eventActivities, ...teamActivities]
            .sort(compareRecentActivityItems)
            .slice(0, 5)
            .map((activity, index) => ({
              id: index + 1,
              type: activity.type,
              user: activity.user_name,
              action: `${activity.action}: ${activity.description}`,
              time: formatTimeAgo(activity.timestamp)
            }));
          
          res.json(activities);
        });
      });
    } else {
      // For players, show team-related activities
      db.all(`
        SELECT 
          'event' as type,
          'upcoming event' as action,
          s.event_name as description,
          s.event_date,
          s.event_time,
          COALESCE(s.createdAt, s.event_date) as timestamp,
          COALESCE(NULLIF(TRIM(COALESCE(coach.name, '') || ' ' || COALESCE(coach.surname, '')), ''), 'Treneris') as user_name
        FROM schedules s
        JOIN teams t ON t.id = s.team_id
        JOIN users u ON u.team_id = s.team_id
        LEFT JOIN users coach ON coach.id = t.coach_id
        WHERE u.id = ?
        AND date(s.event_date) >= date('now')
        ORDER BY s.event_date ASC, time(COALESCE(NULLIF(s.event_time, ''), '23:59:59')) ASC
        LIMIT 5
      `, [userId], (err, playerActivities) => {
        if (err) {
          console.error('Error fetching player activities:', err);
          return res.status(500).json({ error: 'Kļūda, ielādējot aktivitātes' });
        }
        
        activities = playerActivities.map((activity, index) => ({
          id: index + 1,
          type: activity.type,
          user: activity.user_name,
          action: `${activity.action}: ${activity.description}`,
          time: formatTimeAgo(activity.timestamp)
        }));
        
        res.json(activities);
      });
    }
  } catch (error) {
    console.error('Error in recent activity endpoint:', error);
    res.status(500).json({ error: 'Iekšēja servera kļūda' });
  }
});

function parseActivityTimestamp(timestamp) {
  const rawTimestamp = typeof timestamp === 'string' ? timestamp.trim() : timestamp;

  if (typeof rawTimestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTimestamp)) {
    return new Date(`${rawTimestamp}T00:00:00.000Z`);
  }

  if (
    typeof rawTimestamp === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(rawTimestamp)
  ) {
    return new Date(rawTimestamp.replace(' ', 'T') + 'Z');
  }

  return new Date(rawTimestamp);
}

function getScheduleSortValue(activity) {
  if (!activity || activity.type !== 'event') {
    return Number.POSITIVE_INFINITY;
  }

  const datePart = typeof activity.event_date === 'string' ? activity.event_date.trim() : '';
  const timePart = typeof activity.event_time === 'string' ? activity.event_time.trim() : '';

  if (!datePart) {
    return Number.POSITIVE_INFINITY;
  }

  const normalizedTime = timePart
    ? (timePart.length === 5 ? `${timePart}:00` : timePart)
    : '23:59:59';
  const scheduleDate = new Date(`${datePart}T${normalizedTime}`);

  return Number.isNaN(scheduleDate.getTime()) ? Number.POSITIVE_INFINITY : scheduleDate.getTime();
}

function getActivityTimestampValue(activity) {
  const parsedTimestamp = parseActivityTimestamp(activity?.timestamp);
  return Number.isNaN(parsedTimestamp.getTime()) ? 0 : parsedTimestamp.getTime();
}

function compareRecentActivityItems(a, b) {
  const aIsEvent = a?.type === 'event';
  const bIsEvent = b?.type === 'event';

  if (aIsEvent && bIsEvent) {
    return getScheduleSortValue(a) - getScheduleSortValue(b);
  }

  if (aIsEvent !== bIsEvent) {
    return aIsEvent ? -1 : 1;
  }

  return getActivityTimestampValue(b) - getActivityTimestampValue(a);
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = parseActivityTimestamp(timestamp);

  if (Number.isNaN(time.getTime())) {
    return 'Just now';
  }

  const diffInHours = (now - time) / (1000 * 60 * 60);
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
}

function parseScheduleDateTime(eventDate, eventTime, fallbackTime = '23:59:59') {
  const datePart = typeof eventDate === 'string' ? eventDate.trim() : '';
  const rawTimePart = typeof eventTime === 'string' ? eventTime.trim() : '';

  if (!datePart) {
    return null;
  }

  let normalizedTime = fallbackTime;

  if (rawTimePart) {
    if (rawTimePart.length === 5) {
      normalizedTime = `${rawTimePart}:00`;
    } else {
      normalizedTime = rawTimePart;
    }
  }

  const parsedDate = new Date(`${datePart}T${normalizedTime}`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isScheduleEventCompleted(eventDate, eventTime, bufferHours = 2) {
  const scheduledAt = parseScheduleDateTime(eventDate, eventTime);

  if (!scheduledAt) {
    return false;
  }

  const completedAt = new Date(scheduledAt.getTime() + (bufferHours * 60 * 60 * 1000));
  return completedAt.getTime() <= Date.now();
}

// Upload team logo (Coach only)
router.post('/teams/:teamId/logo', authenticateToken, (req, res) => {
  const { teamId } = req.params;
  const { logo } = req.body; // Base64 encoded image
  const userId = req.user.id;

  (async () => {
    try {
      const coach = await getManagedTeamMembership(userId, teamId);

      if (!coach) {
        return res.status(403).json({ error: 'Logotipu var augšupielādēt tikai šīs komandas treneri' });
      }

      await dbRun('UPDATE teams SET logo = ? WHERE id = ?', [logo, teamId]);
      return res.json({ message: 'Logotips veiksmīgi augšupielādēts', logo });
    } catch (error) {
      console.error('Error uploading team logo:', error);
      return res.status(500).json({ error: 'Neizdevās saglabāt logotipu' });
    }
  })();
  return;

  // Check if user is coach of this team
  db.get('SELECT * FROM teams WHERE id = ? AND coach_id = ?', [teamId, userId], (err, team) => {
    if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
    }

    if (!team) {
      return res.status(403).json({ error: 'Logotipu var augšupielādēt tikai komandas treneris' });
    }

    // Save logo (base64 string stored directly in DB for simplicity)
    db.run('UPDATE teams SET logo = ? WHERE id = ?', [logo, teamId], function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: 'Neizdevās saglabāt logotipu' });
      }

      res.json({ message: 'Logotips veiksmīgi augšupielādēts', logo });
    });
  });
});

// Delete team logo (Coach only)
router.delete('/teams/:teamId/logo', authenticateToken, (req, res) => {
  const { teamId } = req.params;
  const userId = req.user.id;

  (async () => {
    try {
      const coach = await getManagedTeamMembership(userId, teamId);

      if (!coach) {
        return res.status(403).json({ error: 'Logotipu var dzēst tikai šīs komandas treneri' });
      }

      await dbRun('UPDATE teams SET logo = NULL WHERE id = ?', [teamId]);
      return res.json({ message: 'Logotips veiksmīgi dzēsts' });
    } catch (error) {
      console.error('Error deleting team logo:', error);
      return res.status(500).json({ error: 'Neizdevās dzēst logotipu' });
    }
  })();
  return;

  db.get('SELECT * FROM teams WHERE id = ? AND coach_id = ?', [teamId, userId], (err, team) => {
    if (err) {
      return res.status(500).json({ error: 'Datubāzes kļūda' });
    }

    if (!team) {
      return res.status(403).json({ error: 'Logotipu var dzēst tikai komandas treneris' });
    }

    db.run('UPDATE teams SET logo = NULL WHERE id = ?', [teamId], function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: 'Neizdevās dzēst logotipu' });
      }

      res.json({ message: 'Logotips veiksmīgi dzēsts' });
    });
  });
});

// Get team statistics summary
router.get('/teams/:teamId/stats', (req, res) => {
  const { teamId } = req.params;

  db.all(
    `SELECT event_date, event_time
     FROM schedules
     WHERE team_id = ?
       AND LOWER(event_type) = 'game'`,
    [teamId],
    (gamesErr, gameRows) => {
      if (gamesErr) {
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      const totalMatches = Array.isArray(gameRows)
        ? gameRows.filter((game) => isScheduleEventCompleted(game.event_date, game.event_time, 2)).length
        : 0;

      db.all(
        `SELECT 
          u.id as user_id,
          u.name,
          u.surname,
          (u.name || ' ' || u.surname) as username,
          COALESCE(ps.matches, 0) as matches,
          COALESCE(ps.goals, 0) as goals,
          COALESCE(ps.assists, 0) as assists,
          COALESCE(ps.yellow_cards, 0) as yellow_cards,
          COALESCE(ps.red_cards, 0) as red_cards
         FROM users u
         LEFT JOIN player_stats ps ON ps.user_id = u.id
         WHERE u.team_id = ? AND LOWER(u.role) != 'coach'`,
        [teamId],
        (playersErr, players) => {
          if (playersErr) {
            return res.status(500).json({ error: 'Datubāzes kļūda' });
          }

          db.get(`
            SELECT
              COUNT(DISTINCT u.id) as playerCount,
              COUNT(DISTINCT s.id) as practiceCount,
              COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0) as presentCount
            FROM users u
            INNER JOIN schedules s ON s.team_id = ? AND LOWER(s.event_type) = 'practice'
            LEFT JOIN attendance a ON a.user_id = u.id AND a.event_id = s.id
            WHERE u.team_id = ? AND LOWER(u.role) = 'player'
          `, [teamId, teamId], (attendanceErr, attendanceResult) => {
            if (attendanceErr) {
              console.error('Error getting attendance:', attendanceErr);
            }

            const safePlayers = Array.isArray(players) ? players : [];
            const attendanceSlots = (Number(attendanceResult?.playerCount) || 0) * (Number(attendanceResult?.practiceCount) || 0);
            const avgAttendance = attendanceSlots > 0
              ? Math.round(((Number(attendanceResult?.presentCount) || 0) / attendanceSlots) * 100)
              : 0;

            const stats = {
              totalPlayers: safePlayers.length,
              totalMatches,
              totalGoals: safePlayers.reduce((sum, player) => sum + (Number(player.goals) || 0), 0),
              totalAssists: safePlayers.reduce((sum, player) => sum + (Number(player.assists) || 0), 0),
              totalYellowCards: safePlayers.reduce((sum, player) => sum + (Number(player.yellow_cards) || 0), 0),
              totalRedCards: safePlayers.reduce((sum, player) => sum + (Number(player.red_cards) || 0), 0),
              avgAttendance,
              topScorers: safePlayers
                .filter((player) => (Number(player.goals) || 0) > 0)
                .sort((a, b) => (Number(b.goals) || 0) - (Number(a.goals) || 0))
                .slice(0, 5),
              topAssists: safePlayers
                .filter((player) => (Number(player.assists) || 0) > 0)
                .sort((a, b) => (Number(b.assists) || 0) - (Number(a.assists) || 0))
                .slice(0, 5),
              goalsDistribution: safePlayers
                .filter((player) => (Number(player.goals) || 0) > 0)
                .map((player) => ({ name: player.name, surname: player.surname, goals: Number(player.goals) || 0 }))
            };

            res.json(stats);
          });
        }
      );
    }
  );
});

  return router;
};
