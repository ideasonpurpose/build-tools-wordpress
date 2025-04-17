


<!-- START template-parts/items/card.php -->

<a
  href="<?php the_permalink(); ?>"
  <?php post_class('card col-12 col-md-6'); ?>
  data-ga-action="Article"
>
  <?php get_template_part('template-parts/partials/card-media'); ?>
  <div class="card__details">
         <h4   class="card__title"><?=           $cardTitle ?></h4>
    <h5 class="card__desc"><?= $cardDesc ?></h5>
  </div>
        </a>

<!-- END template-parts/items/card.php -->


