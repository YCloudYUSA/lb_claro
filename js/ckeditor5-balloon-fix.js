/**
 * @file
 * Fix CKEditor 5 balloon positioning in Layout Builder dialogs.
 *
 * The balloon position calculation fails in off-canvas context, positioning it
 * at -99999px (absolute). Uses requestAnimationFrame to continuously maintain
 * correct viewport-relative position while the balloon is visible.
 */

(function (Drupal) {
  'use strict';

  let rafId = null;

  /**
   * Returns the CKEditor5 instance for a given editable DOM element.
   *
   * Uses Drupal.CKEditor5Instances (the correct Drupal API).
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
   * Returns the viewport-relative bounding rect of the current selection.
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
   * Corrects the position of a balloon panel to be visible in the viewport.
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

    // Use fixed positioning so the balloon stays in viewport regardless of scroll.
    panel.style.position = 'fixed';
    panel.style.top = top + 'px';
    panel.style.left = left + 'px';
    panel.style.zIndex = '10000';
  }

  /**
   * Returns true if the balloon panel needs repositioning.
   *
   * CKEditor uses position:absolute. In the off-canvas dialog context it
   * calculates coordinates that place the balloon far below the viewport
   * (large positive top) or above/left of it (large negative). Both cases
   * require a fix. We also treat any non-fixed balloon as needing a fix,
   * since position:absolute is always wrong in the dialog context.
   */
  function isPanelOffScreen(panel) {
    if (panel.style.position !== 'fixed') return true;
    const rect = panel.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    return rect.top < 0 || rect.left < 0 || rect.top > vh - 50 || rect.left > vw - 50;
  }

  /**
   * rAF loop: while a dialog with CKEditor is open, continuously correct
   * any off-screen balloon panels.
   *
   * Runs every animation frame (~60fps) but only when there is an active
   * dialog AND a visible balloon — stops itself otherwise.
   */
  function correctionLoop() {
    const dialog = document.querySelector('.ui-dialog-off-canvas, .ui-dialog');
    const panels = document.querySelectorAll('.ck-balloon-panel_visible:not(.ck-powered-by-balloon)');

    if (dialog && panels.length) {
      panels.forEach(function (panel) {
        if (isPanelOffScreen(panel)) {
          fixBalloonPosition(panel);
        }
      });
      // Keep looping while balloon is visible.
      rafId = requestAnimationFrame(correctionLoop);
    } else {
      // No visible balloon or no dialog — stop the loop.
      rafId = null;
    }
  }

  /**
   * Starts the rAF correction loop if not already running.
   */
  function startCorrectionLoop() {
    if (!rafId) {
      rafId = requestAnimationFrame(correctionLoop);
    }
  }

  /**
   * Uses MutationObserver to detect when a balloon becomes visible,
   * then starts the rAF loop to maintain correct positioning.
   */
  function observeCkBodyWrapper(wrapper) {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        const panel = mutation.target;
        if (
          panel.classList.contains('ck-balloon-panel') &&
          panel.classList.contains('ck-balloon-panel_visible') &&
          !panel.classList.contains('ck-powered-by-balloon')
        ) {
          startCorrectionLoop();
        }
      });
    }).observe(wrapper, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /**
   * Sets up observers for all .ck-body-wrapper elements, present and future.
   * Called once on initial page load.
   */
  function setupBodyObserver() {
    const existing = document.querySelector('.ck-body-wrapper');
    if (existing) observeCkBodyWrapper(existing);

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
      if (context === document) {
        setupBodyObserver();
      }
    },
  };

})(Drupal);
