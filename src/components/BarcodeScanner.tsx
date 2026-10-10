// Barcode / QR scanner used by the Devices search (spec 5.2).
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Row, Spacer } from '@/components/ui';
import { useT } from '@/i18n';
import { haptic } from '@/services/feedback';
import { useTheme } from '@/theme/ThemeProvider';

export function BarcodeScanner({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}) {
  const theme = useTheme();
  const { t } = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Row style={{ justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <AppText size="section" weight="700" color="#fff">
            {t('devices.scanBarcode')}
          </AppText>
          <IconButton name="close" label={t('common.close')} color="#fff" onPress={onClose} />
        </Row>

        {!permission ? (
          <View style={{ flex: 1 }} />
        ) : !permission.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <AppText color="#fff" align="center">
              {t('devices.scanBarcode')}
            </AppText>
            <Spacer size="lg" />
            <Button title={t('common.allow')} onPress={requestPermission} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a'] }}
              onBarcodeScanned={
                locked
                  ? undefined
                  : (e) => {
                      if (!e?.data) return;
                      setLocked(true);
                      haptic('success');
                      onScan(e.data);
                      setTimeout(() => setLocked(false), 800);
                    }
              }
            />
          </View>
        )}
      </View>
    </Modal>
  );
}
