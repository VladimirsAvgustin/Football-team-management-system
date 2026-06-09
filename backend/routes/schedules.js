const express = require('express');
const router = express.Router();

module.exports = (db) => {
  const normalizePositiveInteger = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
  };

  const getGameEvent = (teamId, eventId, callback) => {
    db.get(
      `SELECT id, team_id, event_date, event_time, event_type
       FROM schedules
       WHERE id = ? AND team_id = ?`,
      [eventId, teamId],
      (err, event) => {
        if (err) {
          return callback(err);
        }

        if (!event) {
          return callback(null, null);
        }

        if (String(event.event_type || '').toLowerCase() !== 'game') {
          return callback(null, false);
        }

        callback(null, event);
      }
    );
  };

  const fetchGameLineupRows = (teamId, eventId, callback) => {
    db.all(`
      SELECT
        u.id as user_id,
        u.name,
        u.surname,
        (u.name || ' ' || u.surname) as username,
        u.email,
        u.avatar,
        CASE WHEN gl.id IS NULL THEN 0 ELSE 1 END as in_lineup,
        CASE
          WHEN gl.id IS NULL THEN NULL
          WHEN a.status = 'present' OR a.status = 'late' THEN 'confirmed'
          WHEN a.status = 'absent' OR a.status = 'excused' THEN 'declined'
          ELSE 'selected'
        END as status,
        a.notes,
        gl.selected_at,
        a.checked_at as responded_at
      FROM users u
      LEFT JOIN game_lineups gl ON gl.user_id = u.id AND gl.event_id = ?
      LEFT JOIN attendance a ON a.user_id = u.id AND a.event_id = ?
      WHERE u.team_id = ? AND LOWER(u.role) = 'player'
      ORDER BY u.surname, u.name
    `, [eventId, eventId, teamId], callback);
  };

  // get schedule by team id
  router.get('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    db.all(
      `SELECT *
       FROM schedules
       WHERE team_id = ?
       ORDER BY event_date ASC, time(COALESCE(NULLIF(event_time, ''), '23:59:59')) ASC, id ASC`,
      [teamId],
      (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, ielādējot grafiku' });
      }
      res.json(rows);
      }
    );
  });

  // add event
  router.post('/teams/:id/schedule', (req, res) => {
    const teamId = req.params.id;
    const { event_name, event_date, location, event_time, event_type, description } = req.body;
    const createdAt = new Date().toISOString();

    if (!event_name || !event_date) {
        return res.status(400).json({ error: 'Notikuma nosaukums un datums ir obligāti' });
    }

    // Check for time conflict
    db.get(
      `SELECT id FROM schedules WHERE team_id = ? AND event_date = ? AND event_time = ?`,
      [teamId, event_date, event_time],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, pārbaudot laika konfliktus' });
        }
        if (existing) {
          return res.status(409).json({ error: 'Šajā datumā un laikā jau ir notikums' });
        }

        db.run(
          `INSERT INTO schedules (team_id, event_name, event_date, location, description, event_time, event_type, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [teamId, event_name, event_date, location, description || '', event_time, event_type, createdAt],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Kļūda, pievienojot notikumu' });
            }
            res.json({ id: this.lastID, team_id: teamId, event_name, event_date, location, description: description || '', event_time, event_type, createdAt });
          }
        );
      }
    );
  });

  // Update event
  router.put('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;
    const { event_name, event_date, location, event_time, event_type, description } = req.body;

    // Check for time conflict (exclude current event)
    db.get(
      `SELECT id FROM schedules WHERE team_id = ? AND event_date = ? AND event_time = ? AND id != ?`,
      [teamId, event_date, event_time, eventId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, pārbaudot laika konfliktus' });
        }
        if (existing) {
          return res.status(409).json({ error: 'Šajā datumā un laikā jau ir notikums' });
        }

        db.run(
          `UPDATE schedules 
           SET event_name = ?, event_date = ?, location = ?, description = ?, event_time = ?, event_type = ?
           WHERE id = ? AND team_id = ?`,
          [event_name, event_date, location, description || '', event_time, event_type, eventId, teamId],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Kļūda, atjauninot notikumu' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notikums nav atrasts' });
            }
            res.json({ success: true });
          }
        );
      }
    );
  });

  // Delete event
  router.delete('/teams/:teamId/schedule/:eventId', (req, res) => {
    const { teamId, eventId } = req.params;

    db.run(
      `DELETE FROM schedules WHERE id = ? AND team_id = ?`,
      [eventId, teamId],
      function (err) {
        if (err) {
        return res.status(500).json({ error: 'Kļūda, dzēšot notikumu' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Notikums nav atrasts' });
        }
        res.json({ success: true });
      }
    );
  });

  // ==================== ATTENDANCE ROUTES ====================

  // Get attendance for a specific event
  router.get('/teams/:teamId/events/:eventId/attendance', (req, res) => {
    const { teamId, eventId } = req.params;

    db.all(`
      SELECT 
        a.id,
        a.user_id,
        a.event_id,
        a.status,
        a.checked_at,
        a.notes,
        u.name, u.surname,
        (u.name || ' ' || u.surname) as username,
        u.email
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      INNER JOIN schedules s ON a.event_id = s.id
      WHERE s.id = ? AND s.team_id = ?
    `, [eventId, teamId], (err, rows) => {
      if (err) {
        console.error('Kļūda, ielādējot apmeklējumu:', err);
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējumu' });
      }
      res.json(rows);
    });
  });

  // Get all players with their attendance status for an event
  router.get('/teams/:teamId/events/:eventId/attendance/full', (req, res) => {
    const { teamId, eventId } = req.params;

    db.all(`
      SELECT 
        u.id as user_id,
        u.name, u.surname,
        (u.name || ' ' || u.surname) as username,
        u.email,
        u.avatar,
        COALESCE(a.status, 'unmarked') as status,
        a.checked_at,
        a.notes
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id AND a.event_id = ?
      WHERE u.team_id = ? AND LOWER(u.role) = 'player'
      ORDER BY u.surname, u.name
    `, [eventId, teamId], (err, rows) => {
      if (err) {
        console.error('Error fetching full attendance:', err);
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējumu' });
      }
      res.json(rows);
    });
  });

  // Set/update attendance for a player at an event
  router.post('/teams/:teamId/events/:eventId/attendance', (req, res) => {
    const { teamId, eventId } = req.params;
    const { user_id, status, notes } = req.body;

    const validStatuses = new Set(['present', 'absent', 'late', 'excused']);

    if (!user_id || !status) {
      return res.status(400).json({ error: 'Lietotāja ID un statuss ir obligāti' });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({ error: 'Nederīgs apmeklējuma statuss' });
    }

    // Verify event belongs to team
    db.get('SELECT id, event_type FROM schedules WHERE id = ? AND team_id = ?', [eventId, teamId], (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (String(event.event_type || '').toLowerCase() !== 'practice') {
        return res.status(400).json({ error: 'Apmeklējumu var atzīmēt tikai treniņiem' });
      }

      db.get(
        `SELECT id FROM users WHERE id = ? AND team_id = ? AND LOWER(role) = 'player'`,
        [user_id, teamId],
        (userErr, player) => {
          if (userErr) {
            return res.status(500).json({ error: 'Datubāzes kļūda' });
          }

          if (!player) {
            return res.status(403).json({ error: 'Spēlētājs nav šīs komandas dalībnieks' });
          }

          // Insert or update attendance
          db.run(`
            INSERT INTO attendance (user_id, event_id, status, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, event_id) DO UPDATE SET
              status = excluded.status,
              notes = excluded.notes,
              checked_at = CURRENT_TIMESTAMP
          `, [user_id, eventId, status, notes || null], function(err) {
            if (err) {
              console.error('Error setting attendance:', err);
              return res.status(500).json({ error: 'Kļūda, saglabājot apmeklējumu' });
            }
            res.json({
              success: true,
              id: this.lastID,
              user_id,
              event_id: eventId,
              status,
              notes
            });
          });
        }
      );
    });
  });

  // Bulk update attendance for an event
  router.post('/teams/:teamId/events/:eventId/attendance/bulk', (req, res) => {
    const { teamId, eventId } = req.params;
    const { attendances } = req.body; // Array of { user_id, status, notes }

    if (!Array.isArray(attendances)) {
      return res.status(400).json({ error: 'Apmeklējuma ierakstiem jābūt masīvam' });
    }

    // Verify event belongs to team
    db.get('SELECT id FROM schedules WHERE id = ? AND team_id = ?', [eventId, teamId], (err, event) => {
      if (err) {
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }
      if (!event) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      const stmt = db.prepare(`
        INSERT INTO attendance (user_id, event_id, status, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, event_id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          checked_at = CURRENT_TIMESTAMP
      `);

      let errors = [];
      attendances.forEach(({ user_id, status, notes }) => {
        stmt.run([user_id, eventId, status, notes || null], (err) => {
          if (err) errors.push({ user_id, error: err.message });
        });
      });

      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: 'Kļūda, atjauninot apmeklējumu' });
        }
        if (errors.length > 0) {
          return res.status(207).json({ partial: true, errors });
        }
        res.json({ success: true, updated: attendances.length });
      });
    });
  });

  // Delete attendance record
  router.delete('/teams/:teamId/events/:eventId/attendance/:userId', (req, res) => {
    const { teamId, eventId, userId } = req.params;

    db.run(`
      DELETE FROM attendance 
      WHERE user_id = ? AND event_id = ? 
        AND event_id IN (SELECT id FROM schedules WHERE team_id = ?)
    `, [userId, eventId, teamId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, dzēšot apmeklējumu' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Apmeklējuma ieraksts nav atrasts' });
      }
      res.json({ success: true });
    });
  });

  // Get attendance statistics for a player
  router.get('/players/:userId/attendance', (req, res) => {
    const { userId } = req.params;
    const { teamId } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count
      FROM attendance a
      INNER JOIN schedules s ON a.event_id = s.id
      WHERE a.user_id = ? AND LOWER(s.event_type) = 'practice'
    `;
    
    const params = [userId];
    if (teamId) {
      query += ' AND s.team_id = ?';
      params.push(teamId);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējuma statistiku' });
      }
      
      const total = row.total_events || 0;
      const present = row.present_count || 0;
      
      res.json({
        ...row,
        attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0
      });
    });
  });

  // Get attendance statistics for a team (practices only)
  router.get('/teams/:teamId/attendance/stats', (req, res) => {
    const { teamId } = req.params;

    // First get total practices count
    db.get(`
      SELECT COUNT(*) as total_practices 
      FROM schedules 
      WHERE team_id = ? AND LOWER(event_type) = 'practice'
    `, [teamId], (err, practiceCount) => {
      if (err) {
        console.error('Error counting practices:', err);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      const totalPractices = practiceCount?.total_practices || 0;

      // Get per-player stats for practices only
      db.all(`
        SELECT 
          u.id as user_id,
          (u.name || ' ' || u.surname) as username,
          u.avatar,
          COUNT(a.id) as total_marked,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN a.status = 'absent' OR a.status = 'excused' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused_count
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id
          AND a.event_id IN (
            SELECT id FROM schedules WHERE team_id = ? AND LOWER(event_type) = 'practice'
          )
        WHERE u.team_id = ? AND LOWER(u.role) = 'player'
        GROUP BY u.id
        ORDER BY present_count DESC
      `, [teamId, teamId], (err, rows) => {
        if (err) {
          console.error('Error fetching team attendance stats:', err);
          return res.status(500).json({ error: 'Kļūda, ielādējot apmeklējuma statistiku' });
        }
        
        // Calculate attendance rate for each player based on total practices
        const stats = rows.map(row => {
          const presentCount = Number(row.present_count) || 0;
          const absentCount = Number(row.absent_count) || 0;
          const lateCount = Number(row.late_count) || 0;
          const markedCount = presentCount + absentCount + lateCount;

          return {
            ...row,
            total_practices: totalPractices,
            unmarked_count: Math.max(totalPractices - markedCount, 0),
            attendance_rate: totalPractices > 0
              ? Math.round((presentCount / totalPractices) * 100)
              : 0
          };
        });
        
        res.json(stats);
      });
    });
  });

  // ==================== END ATTENDANCE ROUTES ====================

  // ==================== GAME LINEUP ROUTES ====================

  router.get('/teams/:teamId/events/:eventId/lineup/full', (req, res) => {
    const { teamId, eventId } = req.params;

    getGameEvent(teamId, eventId, (eventErr, event) => {
      if (eventErr) {
        console.error('Error checking game event:', eventErr);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      if (event === null) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (event === false) {
        return res.status(400).json({ error: 'Sastāvu var veidot tikai spēlēm' });
      }

      fetchGameLineupRows(teamId, eventId, (lineupErr, rows) => {
        if (lineupErr) {
          console.error('Error fetching game lineup:', lineupErr);
          return res.status(500).json({ error: 'Kļūda, ielādējot spēles sastāvu' });
        }

        res.json(rows);
      });
    });
  });

  router.get('/teams/:teamId/events/:eventId/lineup/suggested', (req, res) => {
    const { teamId, eventId } = req.params;

    getGameEvent(teamId, eventId, (eventErr, event) => {
      if (eventErr) {
        console.error('Error checking game event:', eventErr);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      if (event === null) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (event === false) {
        return res.status(400).json({ error: 'Sastāvu var veidot tikai spēlēm' });
      }

      const currentDateTime = `${event.event_date} ${event.event_time || '23:59'}`;

      db.get(`
        SELECT id
        FROM schedules
        WHERE team_id = ?
          AND id != ?
          AND LOWER(event_type) = 'game'
          AND datetime(event_date || ' ' || COALESCE(NULLIF(event_time, ''), '23:59')) < datetime(?)
          AND EXISTS (
            SELECT 1
            FROM game_lineups gl
            WHERE gl.event_id = schedules.id
          )
        ORDER BY datetime(event_date || ' ' || COALESCE(NULLIF(event_time, ''), '23:59')) DESC, id DESC
        LIMIT 1
      `, [teamId, eventId, currentDateTime], (previousErr, previousGame) => {
        if (previousErr) {
          console.error('Error finding previous game lineup:', previousErr);
          return res.status(500).json({ error: 'Kļūda, ielādējot iepriekšējo sastāvu' });
        }

        if (!previousGame) {
          return res.json({ previousEventId: null, playerIds: [] });
        }

        db.all(`
          SELECT user_id
          FROM game_lineups
          WHERE event_id = ?
          ORDER BY selected_at ASC, id ASC
        `, [previousGame.id], (lineupErr, rows) => {
          if (lineupErr) {
            console.error('Error loading previous game lineup:', lineupErr);
            return res.status(500).json({ error: 'Kļūda, ielādējot iepriekšējo sastāvu' });
          }

          res.json({
            previousEventId: previousGame.id,
            playerIds: rows.map((row) => row.user_id)
          });
        });
      });
    });
  });

  router.post('/teams/:teamId/events/:eventId/lineup/bulk', (req, res) => {
    const { teamId, eventId } = req.params;
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds)) {
      return res.status(400).json({ error: 'Sastāva spēlētājiem jābūt masīvam' });
    }

    const normalizedIds = [...new Set(playerIds.map(normalizePositiveInteger).filter(Boolean))];

    getGameEvent(teamId, eventId, (eventErr, event) => {
      if (eventErr) {
        console.error('Error checking game event:', eventErr);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      if (event === null) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (event === false) {
        return res.status(400).json({ error: 'Sastāvu var veidot tikai spēlēm' });
      }

      const placeholders = normalizedIds.map(() => '?').join(',');
      const validateSql = normalizedIds.length
        ? `SELECT id FROM users WHERE team_id = ? AND LOWER(role) = 'player' AND id IN (${placeholders})`
        : `SELECT id FROM users WHERE 1 = 0`;
      const validateParams = normalizedIds.length ? [teamId, ...normalizedIds] : [];

      db.all(validateSql, validateParams, (playerErr, validPlayers) => {
        if (playerErr) {
          console.error('Error validating lineup players:', playerErr);
          return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        const validIds = validPlayers.map((player) => player.id);

        if (validIds.length !== normalizedIds.length) {
          return res.status(400).json({ error: 'Daži spēlētāji nepieder šai komandai' });
        }

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          const deleteSql = validIds.length
            ? `DELETE FROM game_lineups WHERE event_id = ? AND user_id NOT IN (${validIds.map(() => '?').join(',')})`
            : `DELETE FROM game_lineups WHERE event_id = ?`;
          const deleteParams = validIds.length ? [eventId, ...validIds] : [eventId];

          db.run(deleteSql, deleteParams, (deleteErr) => {
            if (deleteErr) {
              db.run('ROLLBACK');
              console.error('Error removing lineup players:', deleteErr);
              return res.status(500).json({ error: 'Kļūda, saglabājot sastāvu' });
            }

            const deleteAttendanceSql = validIds.length
              ? `DELETE FROM attendance WHERE event_id = ? AND user_id NOT IN (${validIds.map(() => '?').join(',')})`
              : `DELETE FROM attendance WHERE event_id = ?`;
            const deleteAttendanceParams = validIds.length ? [eventId, ...validIds] : [eventId];

            db.run(deleteAttendanceSql, deleteAttendanceParams, (deleteAttendanceErr) => {
              if (deleteAttendanceErr) {
                console.error('Error removing lineup attendance:', deleteAttendanceErr);
              }
            });

            const insertStmt = db.prepare(`
              INSERT INTO game_lineups (event_id, user_id)
              VALUES (?, ?)
              ON CONFLICT(event_id, user_id) DO NOTHING
            `);

            let insertError = null;

            validIds.forEach((playerId) => {
              insertStmt.run([eventId, playerId], (insertErr) => {
                if (insertErr && !insertError) {
                  insertError = insertErr;
                }
              });
            });

            insertStmt.finalize((finalizeErr) => {
              if (insertError || finalizeErr) {
                db.run('ROLLBACK');
                console.error('Error inserting lineup players:', insertError || finalizeErr);
                return res.status(500).json({ error: 'Kļūda, saglabājot sastāvu' });
              }

              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  console.error('Error committing lineup:', commitErr);
                  return res.status(500).json({ error: 'Kļūda, saglabājot sastāvu' });
                }

                fetchGameLineupRows(teamId, eventId, (lineupErr, rows) => {
                  if (lineupErr) {
                    console.error('Error fetching saved lineup:', lineupErr);
                    return res.status(500).json({ error: 'Kļūda, ielādējot spēles sastāvu' });
                  }

                  res.json({ success: true, selected: validIds.length, players: rows });
                });
              });
            });
          });
        });
      });
    });
  });

  router.post('/teams/:teamId/events/:eventId/lineup/response', (req, res) => {
    const { teamId, eventId } = req.params;
    const { user_id, status, notes } = req.body;
    const playerId = normalizePositiveInteger(user_id);
    const validStatuses = new Set(['confirmed', 'declined']);

    if (!playerId || !status) {
      return res.status(400).json({ error: 'Lietotāja ID un statuss ir obligāti' });
    }

    if (!validStatuses.has(status)) {
      return res.status(400).json({ error: 'Nederīgs sastāva statuss' });
    }

    getGameEvent(teamId, eventId, (eventErr, event) => {
      if (eventErr) {
        console.error('Error checking game event:', eventErr);
        return res.status(500).json({ error: 'Datubāzes kļūda' });
      }

      if (event === null) {
        return res.status(404).json({ error: 'Notikums nav atrasts' });
      }

      if (event === false) {
        return res.status(400).json({ error: 'Sastāvu var veidot tikai spēlēm' });
      }

      db.get(`
        SELECT gl.id
        FROM game_lineups gl
        INNER JOIN users u ON u.id = gl.user_id
        WHERE gl.event_id = ? AND gl.user_id = ? AND u.team_id = ? AND LOWER(u.role) = 'player'
      `, [eventId, playerId, teamId], (lineupErr, lineupEntry) => {
        if (lineupErr) {
          console.error('Error checking lineup entry:', lineupErr);
          return res.status(500).json({ error: 'Datubāzes kļūda' });
        }

        if (!lineupEntry) {
          return res.status(403).json({ error: 'Spēlētājs nav šīs spēles sastāvā' });
        }

        const attendanceStatus = status === 'confirmed' ? 'present' : 'excused';

        db.run(`
          INSERT INTO attendance (user_id, event_id, status, notes)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, event_id) DO UPDATE SET
            status = excluded.status,
            notes = excluded.notes,
            checked_at = CURRENT_TIMESTAMP
        `, [playerId, eventId, attendanceStatus, notes || null], function(updateErr) {
          if (updateErr) {
            console.error('Error saving lineup response:', updateErr);
            return res.status(500).json({ error: 'Kļūda, saglabājot atbildi' });
          }

          res.json({
            success: true,
            user_id: playerId,
            event_id: eventId,
            status,
            notes: notes || null
          });
        });
      });
    });
  });

  // ==================== END GAME LINEUP ROUTES ====================

   // Get team players
  router.get('/teams/:teamId/players', (req, res) => {
    const teamId = req.params.teamId;
    
    db.all(`
        SELECT 
            u.id, 
            (u.name || ' ' || u.surname) as username,
            u.name,
            u.surname, 
            u.email,
            ps.matches,
            ps.goals,
            ps.assists,
            ps.yellow_cards,
            ps.red_cards
        FROM users u
        LEFT JOIN player_stats ps ON u.id = ps.user_id
        WHERE u.team_id = ? AND LOWER(u.role) = 'player'
    `, [teamId], (err, rows) => {
        if (err) {
            console.error('Error fetching players:', err);
            return res.status(500).json({ error: 'Neizdevās ielādēt komandas spēlētājus' });
        }
        
        // Convert null values to 0 when statistics are missing
        const players = rows.map(player => ({
            ...player,
            stats: {
                matches: player.matches || 0,
                goals: player.goals || 0,
                assists: player.assists || 0,
                yellow_cards: player.yellow_cards || 0,
                red_cards: player.red_cards || 0
            }
        }));
        
        res.json({ players });
    });
});
  return router;
};
