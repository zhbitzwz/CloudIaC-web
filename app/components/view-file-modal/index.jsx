import React from 'react';
import { Modal } from 'antd';
import Coder from 'components/coder';

export default ({
  width = 680,
  footer = null,
  title, 
  visible, 
  content, 
  onClose,
  bodyStyle,
  ...props
}) => {
  return (
    <Modal 
      width={width}
      footer={footer}
      title={title}
      visible={visible}
      onCancel={onClose}
      bodyStyle={bodyStyle}
      {...props}
    >
      <Coder value={content} style={{ height: 350 }} />
    </Modal>
  );
}