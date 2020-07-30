<?php

namespace Drupal\lb_claro;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Core\DependencyInjection\ServiceModifierInterface;
use Symfony\Component\DependencyInjection\Reference;

/**
 * Defines a service modifier for lb_claro.
 */
class LbClaroServiceProvider implements ServiceModifierInterface {

  /**
   * {@inheritdoc}
   */
  public function alter(ContainerBuilder $container) {
    $renderer = $container->getDefinition('main_content_renderer.off_canvas');
    $renderer->setClass(OffCanvasRenderer::class);
    $arguments = $renderer->getArguments();
    $arguments[] = 'side';
    $arguments[] = new Reference('config.factory');
    $renderer->setArguments($arguments);
    $container->setDefinition('main_content_renderer.off_canvas', $renderer);
  }

}
