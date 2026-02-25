/**
 * @file
 * Fix CKEditor 5 balloon positioning in Layout Builder dialogs.
 *
 * The balloon position calculation fails in off-canvas context, positioning it
 * at -99999px. Uses MutationObserver on .ck-body-wrapper to detect when
 * CKEditor repositions the balloon off-screen and corrects it.
 */

(function (Drupal) {
  'use strict';

  // Guard against correction triggering its own observer callback.
  let fixInProgress = false;

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

    fixInProgress = true;
    panel.style.position = 'fixed';
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    panel.style.zIndex = '10000';
    fixInProgress = false;
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
   * Handles mutations on .ck-body-wrapper — both class and style changes.
   *
   * CKEditor5 first adds ck-balloon-panel_visible (class change), then
   * immediately sets top/left via style. Watching both ensures we catch
   * the final off-screen position regardless of which fires last.
   */
  function handleMutation(mutations) {
    if (fixInProgress) return;
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
  }

  /**
   * Attaches a MutationObserver to a .ck-body-wrapper element.
   */
  function observeCkBodyWrapper(wrapper) {
    new MutationObserver(handleMutation).observe(wrapper, {
      subtree: true,
      attributes: true,
      // Watch both class (visibility toggle) and style (position changes).
      attributeFilter: ['class', 'style'],
    });
  }

  /**
   * Sets up observers for .ck-body-wrapper, including ones added dynamically
   * after AJAX loads CKEditor in the off-canvas sidebar.
   *
   * Called once on initial page load (context === document).
   */
  function setupBodyObserver() {
    // Observe any .ck-body-wrapper already in the DOM.
    const existing = document.querySelector('.ck-body-wrapper');
    if (existing) observeCkBodyWrapper(existing);

    // Watch for .ck-body-wrapper added later when CKEditor initializes
    // inside the off-canvas AJAX response.
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('ck-body-wrapper')) {
            observeCkBodyWrapper(node);
          }
        });
      });
    }).observe(document.body, { childList: true });
  }

  Drupal.behaviors.ckEditor5BalloonFix = {
    attach: function (context, settings) {
      // Run setup once on initial page load only.
      // Skipping AJAX sub-contexts because .ck-body-wrapper is always on <body>,
      // not inside the off-canvas form context.
      if (context === document) {
        setupBodyObserver();
      }
    },
  };

})(Drupal);
