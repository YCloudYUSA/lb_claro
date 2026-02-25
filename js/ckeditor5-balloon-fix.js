/**
 * @file
 * Fix CKEditor 5 balloon positioning in Layout Builder dialogs.
 *
 * The balloon position calculation fails in off-canvas context, positioning it
 * at -99999px. Uses MutationObserver to detect off-screen balloons and corrects
 * their position using the Drupal CKEditor5Instances API.
 */

(function (Drupal, once) {
  'use strict';

  /**
   * Returns the CKEditor5 instance for a given editable DOM element.
   *
   * Uses Drupal.CKEditor5Instances (the correct Drupal API) instead of
   * the non-existent editable.ckeditorInstance property.
   */
  function getEditorInstance(editable) {
    if (!Drupal.CKEditor5Instances) return null;
    const editorId = editable.getAttribute('data-ckeditor5-id');
    if (editorId) return Drupal.CKEditor5Instances.get(editorId) || null;
    let found = null;
    Drupal.CKEditor5Instances.forEach(function (editor) {
      try {
        if (editor.editing.view.getDomRoot() === editable) found = editor;
      } catch (e) {}
    });
    return found;
  }

  /**
   * Returns the bounding rect of the current selection in the editor.
   */
  function getSelectionRect(editable) {
    const editor = getEditorInstance(editable);
    if (!editor) return null;
    try {
      const range = editor.model.document.selection.getFirstRange();
      if (!range) return null;
      const viewRange = editor.editing.mapper.toViewRange(range);
      const domRange = editor.editing.view.domConverter.viewRangeToDom(viewRange);
      const rect = domRange.getBoundingClientRect();
      if (rect && rect.width >= 0) return rect;
    } catch (e) {}
    return null;
  }

  /**
   * Corrects the position of an off-screen balloon panel.
   */
  function fixBalloonPosition(panel) {
    const dialog = document.querySelector('.ui-dialog-off-canvas, .ui-dialog');
    if (!dialog) return;

    const dialogRect = dialog.getBoundingClientRect();
    let top = dialogRect.top + 150;
    let left = dialogRect.left + 50;

    const editable = document.querySelector('.ck-editor__editable');
    if (editable) {
      const selRect = getSelectionRect(editable);
      if (selRect) {
        top = selRect.bottom + 10;
        left = selRect.left;
      }
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + 350 > vw) left = vw - 370;
    if (left < 10) left = 10;
    if (top + 250 > vh) top = vh - 270;
    if (top < 10) top = 10;

    panel.style.position = 'fixed';
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    panel.style.zIndex = '10000';
  }

  /**
   * Returns true if the balloon panel is rendered off-screen.
   *
   * Uses getBoundingClientRect() instead of fragile string comparison
   * against '-99999px' inline style values.
   */
  function isPanelOffScreen(panel) {
    const rect = panel.getBoundingClientRect();
    return rect.top < -100 || rect.left < -100;
  }

  /**
   * Attaches a MutationObserver to a .ck-body-wrapper element to watch for
   * balloon panels becoming visible and off-screen.
   */
  function observeCkBodyWrapper(wrapper) {
    new MutationObserver(function (mutations) {
      if (!document.querySelector('.ui-dialog-off-canvas, .ui-dialog')) return;
      mutations.forEach(function (mutation) {
        const panel = mutation.target;
        if (
          panel.classList.contains('ck-balloon-panel') &&
          panel.classList.contains('ck-balloon-panel_visible') &&
          !panel.classList.contains('ck-powered-by-balloon') &&
          isPanelOffScreen(panel)
        ) {
          fixBalloonPosition(panel);
        }
      });
    }).observe(wrapper, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  Drupal.behaviors.ckEditor5BalloonFix = {
    attach: function (context, settings) {
      // Observe .ck-body-wrapper elements already in DOM.
      once('ck-balloon-fix', '.ck-body-wrapper', context).forEach(observeCkBodyWrapper);

      // Watch for .ck-body-wrapper added later (CKEditor initializes after AJAX).
      once('ck-balloon-fix-body', 'body').forEach(function (body) {
        new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
              if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ck-body-wrapper')) {
                observeCkBodyWrapper(node);
              }
            });
          });
        }).observe(body, { childList: true });
      });
    },
  };

})(Drupal, once);
