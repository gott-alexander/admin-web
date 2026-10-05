// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2020-2026 grommunio GmbH

import React, { useState } from 'react';
import { makeStyles } from 'tss-react/mui';
import { Button, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, MenuItem, TextField, Theme, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { copyToClipboard } from '../../../utils';
import { Check, CopyAll, ErrorOutline, TaskAlt } from '@mui/icons-material';
import { BaseDomain } from '../../../types/domains';
import { createDkimKeypair } from '../../../actions/domains';
import { useAppDispatch } from '../../../store';
import Feedback from '../../../components/Feedback';


const useStyles = makeStyles()((theme: Theme) => ({
  flexRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 8,
  },
  divider: {
    margin: theme.spacing(2, 0, 1, 0),
  },
  result: {
    marginBottom: 16,
  },
  manual: {
    border: `1px dashed ${theme.palette.warning.main}`,
    borderRadius: 4,
    marginTop: 8,
    padding: 16,
  },
}));

interface GenerateDkimKeysProps {
  open: boolean;
  onClose: () => void;
  domain: BaseDomain,
}

function GenerateDkimKeys({ open, onClose, domain }: GenerateDkimKeysProps) {
  const dispatch = useAppDispatch();
  const { classes } = useStyles();
  const { t } = useTranslation();
  const [pubKey, setPubkey] = useState("");
  const [type, setType] = useState("rsa");
  const [mode, setMode] = useState("dns");
  const [selector, setSelector] = useState("");
  const [loading, setLoading] = useState(false);
  const [dbStored, setDbStored] = useState(true);
  const [redisStored, setRedisStored] = useState(true);
  const [redisError, setRedisError] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  const handleKeygen = async () => {
    setKeyCopied(false);
    setLoading(true);
    const response = await dispatch(createDkimKeypair(domain.ID, { type, mode, selector: selector || undefined }))
      .catch((err) => setSnackbar(err));
    setPubkey(typeof response === "string" ? response : (response?.pubKey ?? ""));
    setDbStored(typeof response === "object" && response !== null ? Boolean(response.dbStored) : false);
    setRedisStored(typeof response === "object" && response !== null ? Boolean(response.redisStored) : false);
    setRedisError(typeof response === "object" && response !== null && response.redisError ? String(response.redisError) : "");
    setLoading(false);
  }

  const handleCopy = async () => {
    if(!pubKey) return;
    const success = await copyToClipboard(pubKey);
    if(success) setKeyCopied(true);
  }

  const handleClose = () => {
    onClose();
    setPubkey("");
    setKeyCopied(false);
    setLoading(false);
    setType("rsa");
    setSelector("");
    setMode("dns");
  }

  return (
    <Dialog open={open} maxWidth="md" onClose={handleClose}>
      <DialogTitle>{t("Generate DKIM keypair")}</DialogTitle>
      <DialogContent>
        <div style={{ marginTop: 8 }}>
          <TextField
            label={t("Type")}
            value={type}
            onChange={e => setType(e.target.value)}
            fullWidth
            select
          >
            <MenuItem value="rsa">rsa</MenuItem>
            <MenuItem value="ed25519">ed25519</MenuItem>
          </TextField>
          <TextField
            label={t("Output mode")}
            value={mode}
            onChange={e => setMode(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            select
          >
            <MenuItem value="dns">dns</MenuItem>
            <MenuItem value="dnskey">dnskey</MenuItem>
            <MenuItem value="plain">plain</MenuItem>
          </TextField>
          <TextField
            label={t("selector")}
            value={selector}
            onChange={e => setSelector(e.target.value)}
            placeholder='dkim'
            fullWidth
            sx={{ my: 1 }}
            helperText={t("default") + ": 'dkim'"}
          />
          <div style={{ display: "flex" }}>
            <Button
              onClick={handleKeygen}
              variant='contained'
              size='small'
              sx={{ ml: 1, flex: 1 }}
            >
              {loading ? <CircularProgress size={24}/> : t('Generate')}
            </Button>
          </div>
        </div>
        <Divider className={classes.divider}/>
        {pubKey && <Typography sx={{ mb: 0.5, fontWeight: 700 }}>Public key:</Typography>}
        <pre>
          {pubKey}
        </pre>
        {!!pubKey && <Button
          onClick={handleCopy}
          variant='contained'
          size='small'
          sx={{ mt: 2, mb: 2 }}
          startIcon={keyCopied ? <Check /> : <CopyAll />}
        >
          {t(keyCopied ? "Copied" : "Copy key")}
        </Button>}
        {!!pubKey && dbStored && redisStored && <div className={classes.manual}>
          <div className={classes.flexRow}>
            <TaskAlt color='success' sx={{ mr: 2 }}/>
            <Typography variant='h6'>
              {t("The key has been installed on the server")}
            </Typography>
          </div>
          <Typography sx={{ mb: 1 }}>
            {t("The private key is stored in the server database and was pushed to the DKIM keystore; it is used for signing automatically")}.
          </Typography>
        </div>}
        {!!pubKey && (!dbStored || !redisStored) && <div className={classes.manual}>
          <div className={classes.flexRow}>
            <ErrorOutline color='error' sx={{ mr: 2 }}/>
            <Typography variant='h6' color='error'>
              {t("The key could not be stored completely")}
            </Typography>
          </div>
          <Typography sx={{ mb: 1 }}>
            {!dbStored
              ? <>{t("The private key could not be saved in the server database")}. {t("Please check the server configuration and try again")}.</>
              : <>{t("The private key is saved in the server database, but the DKIM keystore push failed")}{redisError ? `: ${redisError}` : ""}. {t("The server retries the push automatically every minute")}.</>}
          </Typography>
        </div>}
      </DialogContent>
      <Feedback
        snackbar={snackbar}
        onClose={() => setSnackbar("")}
      />
    </Dialog>
  );
}


export default GenerateDkimKeys;